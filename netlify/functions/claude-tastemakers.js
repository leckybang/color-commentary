/**
 * Claude-powered tastemaker buzz curator.
 *
 * Given a user's taste profile, asks Claude to surface what pop-culture
 * tastemakers — NYT Books, LitHub Bookmarks, Pitchfork, The Cut, Refinery 29,
 * Rotten Tomatoes critics, Vulture, The New Yorker — have been talking about
 * recently. The goal is "buzz from outlets known for taste," not deep-genre
 * fandom or generic streaming charts.
 *
 * Returns JSON: { items: [{ title, creator, type, source, blurb, reason }] }
 * Each `source` is the publication or critical context. `blurb` is a 1-sentence
 * read on what's being said. `reason` is why it lines up with the reader.
 *
 * Env vars required: ANTHROPIC_API_KEY
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'

const MODEL = 'claude-haiku-4-5'

async function callClaude(apiKey, systemPrompt, userContent, maxTokens = 1800, temperature = 0.6) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 120)}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

function extractJSON(text) {
  try { return JSON.parse(text) } catch {}
  const match = text.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  return null
}

function formatProfile(profile) {
  const lines = []
  if (profile.music?.artists?.length) lines.push(`Music: ${profile.music.artists.slice(0, 10).join(', ')}`)
  if (profile.music?.genres?.length) lines.push(`Music vibes: ${profile.music.genres.slice(0, 6).join(', ')}`)
  if (profile.movies?.directors?.length) lines.push(`Directors: ${profile.movies.directors.slice(0, 8).join(', ')}`)
  if (profile.movies?.actors?.length) lines.push(`Actors: ${profile.movies.actors.slice(0, 6).join(', ')}`)
  if (profile.movies?.genres?.length) lines.push(`Film vibes: ${profile.movies.genres.slice(0, 6).join(', ')}`)
  if (profile.tv?.shows?.length) lines.push(`TV: ${profile.tv.shows.slice(0, 8).join(', ')}`)
  if (profile.books?.authors?.length) lines.push(`Authors: ${profile.books.authors.slice(0, 8).join(', ')}`)
  if (profile.books?.genres?.length) lines.push(`Reading: ${profile.books.genres.slice(0, 6).join(', ')}`)
  return lines.join('\n') || '(no preferences set)'
}

function formatCatalogTitles(items, limit = 12) {
  return (items || [])
    .filter((i) => i.title)
    .slice(0, limit)
    .map((i) => `- "${i.title}"${i.creator ? ` (${i.creator})` : ''}`)
    .join('\n')
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || ''
  if (event.httpMethod === 'OPTIONS') return handleOptions(origin)
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ items: [], fallback: true }) }
  }

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Invalid JSON' }) } }

  const { profile = {}, catalogItems = [] } = body

  const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const systemPrompt = `You are a cultural curator who tracks what pop-culture tastemakers — NYT Books / NYT Book Review, LitHub's Bookmarks newsletter, The Cut, Refinery 29, Pitchfork, Rotten Tomatoes critics, Vulture, The New Yorker, The Atlantic, The Ringer, BBC, The Guardian's culture desk — have been covering.

You are NOT a deep-genre engine. You don't surface niche YA romantasy, obscure metal subgenres, or filler streaming-chart entries. You surface what *critics with taste* have flagged as worth attention in the last few months.

You can speak in present tense about what these outlets cover, but never invent fake reviews or fake quotes. Only feature works you genuinely know exist and were notably discussed.

For each pick give:
- title (string)
- creator (string — artist, director, author, showrunner)
- type ("music" | "movie" | "tv" | "book")
- source (which publication or critical context — e.g. "Pitchfork", "NYT Book Review", "LitHub Bookmarks", "The Cut", "Rotten Tomatoes Critics' Pick", "Vulture")
- blurb (1 sentence on what tastemakers are saying — no fabricated quotes)
- reason (1 short sentence on why this lines up with the reader's taste profile)

Aim for 8 picks. Balance media types — at least 1 of each (music, movie, tv, book). Skip anything you'd have to invent.

Respond ONLY with valid JSON, no prose outside it, no markdown fences:
{"items":[{"title":"","creator":"","type":"","source":"","blurb":"","reason":""}]}`

  const userContent = `It is ${monthYear}. The reader's taste profile:
${formatProfile(profile)}

Already in their catalog (don't recommend these again):
${formatCatalogTitles(catalogItems) || '(empty)'}

Surface what tastemakers are buzzing about right now that this person should know about. 8 picks.`

  try {
    const raw = await callClaude(apiKey, systemPrompt, userContent, 2200, 0.65)
    const parsed = extractJSON(raw)

    if (!parsed || !Array.isArray(parsed.items)) {
      console.error('claude-tastemakers: unparseable response', raw?.slice(0, 300))
      return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ items: [], fallback: true }) }
    }

    const items = parsed.items
      .map((i) => ({
        title: String(i.title || '').slice(0, 160),
        creator: String(i.creator || '').slice(0, 120),
        type: ['music', 'movie', 'tv', 'book'].includes(i.type) ? i.type : 'movie',
        source: String(i.source || '').slice(0, 80),
        blurb: String(i.blurb || '').slice(0, 280),
        reason: String(i.reason || '').slice(0, 220),
        isTastemaker: true,
      }))
      .filter((i) => i.title)
      .slice(0, 12)

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({ items, generatedAt: new Date().toISOString() }),
    }
  } catch (err) {
    console.error('claude-tastemakers error', err.message)
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ items: [], fallback: true }) }
  }
}
