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

  const systemPrompt = `You are a cultural curator who tracks what pop-culture tastemakers — LitHub's Bookmarks (which aggregates rave book reviews), NYT Book Review, Rotten Tomatoes critics, Pitchfork, The Cut, Vulture, The New Yorker, The Atlantic, The Ringer — have been raving about.

EVERYTHING YOU SURFACE IS A RAVE. This is a "what's genuinely great right now" list, not a "what exists" list. Do not include anything mixed, divisive, or merely fine. No hedging, no "skippable," no "your mileage may vary." If you wouldn't press it into a friend's hands, leave it out.

You are NOT a deep-genre engine. No niche YA romantasy, obscure subgenres, or streaming-chart filler. Critics-with-taste only.

Never invent reviews or quotes. Only feature works you genuinely know exist and were genuinely acclaimed.

TWO ANCHOR PICKS ARE MANDATORY (always include both, first in the list):
1. A BOOK that LitHub Bookmarks or the NYT Book Review rave-reviewed — broadly beloved by critics, not a mixed reception. source must name the outlet.
2. A MOVIE or TV show that is NEW and FRESH on Rotten Tomatoes — recently released, Certified Fresh / high critic score. source like "Rotten Tomatoes — Certified Fresh".

Then fill the rest (about 6 more) with other raves across music/movies/TV/books — at least one music pick (Pitchfork-grade) and balance the types.

For each pick give:
- title (string)
- creator (string — artist, director, author, showrunner)
- type ("music" | "movie" | "tv" | "book")
- source (the publication + the nature of the praise — e.g. "LitHub Bookmarks — rave", "Rotten Tomatoes — Certified Fresh", "Pitchfork — Best New Music", "NYT Book Review — Editors' Choice")
- blurb (1 confident sentence on why critics love it — no fabricated quotes)
- reason (1 short sentence connecting it to the reader's taste — only if genuine; otherwise speak to why the work itself is essential)

Respond ONLY with valid JSON, no prose outside it, no markdown fences:
{"items":[{"title":"","creator":"","type":"","source":"","blurb":"","reason":""}]}`

  const userContent = `It is ${monthYear}. The reader's taste profile:
${formatProfile(profile)}

Already in their catalog (don't recommend these again):
${formatCatalogTitles(catalogItems) || '(empty)'}

Give ~8 picks, all genuine raves. Pick 1 (book) MUST be a LitHub Bookmarks / NYT Book Review rave. Pick 2 (movie or TV) MUST be new and Certified Fresh on Rotten Tomatoes. No mixed or skippable picks.`

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
