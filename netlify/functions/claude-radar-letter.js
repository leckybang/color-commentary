/**
 * Claude-powered Weekly Radar letter generator.
 *
 * Two sequential Claude calls:
 *   1. Taste profile summary — 2-3 sentences distilled from catalog + stated prefs.
 *   2. Letter writing — picks 3-5 radar items, writes a personal dispatch in the
 *      app's warm/insufferable voice, weaving in the reader's own reviews.
 *
 * Returns JSON: { greeting, paragraphs, featuredTitles, closing, weekLabel }
 * On any Claude failure returns { fallback: true } so the client can render
 * the template letter instead.
 *
 * Env vars required: ANTHROPIC_API_KEY
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'

const MODEL = 'claude-haiku-4-5'

function currentWeekLabel() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  return `${fmt(monday)}–${fmt(sunday)}, ${sunday.getFullYear()}`
}

async function callClaude(apiKey, systemPrompt, userContent, maxTokens = 600, temperature = 0.5) {
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

function formatCatalogForSummary(catalogItems) {
  return (catalogItems || [])
    .filter((i) => i.status === 'finished' && i.title)
    .sort((a, b) => new Date(b.dateConsumed || b.dateAdded || 0) - new Date(a.dateConsumed || a.dateAdded || 0))
    .slice(0, 15)
    .map((i) => {
      const stars = i.rating > 0 ? ` ${'★'.repeat(i.rating)}` : ''
      const review = i.review ? ` — "${i.review.slice(0, 80)}"` : ''
      return `- "${i.title}"${i.creator ? ` by ${i.creator}` : ''} (${i.type})${stars}${review}`
    })
    .join('\n')
}

function formatCatalogForLetter(catalogItems) {
  return (catalogItems || [])
    .filter((i) => i.status === 'finished' && i.title)
    .sort((a, b) => new Date(b.dateConsumed || b.dateAdded || 0) - new Date(a.dateConsumed || a.dateAdded || 0))
    .slice(0, 6)
    .map((i) => {
      const stars = i.rating > 0 ? ` ${'★'.repeat(i.rating)}` : ''
      const review = i.review ? ` — "${i.review.slice(0, 140)}"` : ''
      return `- "${i.title}"${i.creator ? ` by ${i.creator}` : ''} (${i.type})${stars}${review}`
    })
    .join('\n')
}

function formatProfile(profile) {
  const lines = []
  if (profile.music?.artists?.length) lines.push(`Favorite music artists: ${profile.music.artists.slice(0, 8).join(', ')}`)
  if (profile.music?.genres?.length) lines.push(`Music genres: ${profile.music.genres.slice(0, 6).join(', ')}`)
  if (profile.movies?.directors?.length) lines.push(`Favorite directors: ${profile.movies.directors.slice(0, 6).join(', ')}`)
  if (profile.movies?.genres?.length) lines.push(`Film genres: ${profile.movies.genres.slice(0, 6).join(', ')}`)
  if (profile.tv?.shows?.length) lines.push(`Favorite TV: ${profile.tv.shows.slice(0, 6).join(', ')}`)
  if (profile.books?.authors?.length) lines.push(`Favorite authors: ${profile.books.authors.slice(0, 6).join(', ')}`)
  if (profile.books?.genres?.length) lines.push(`Book genres: ${profile.books.genres.slice(0, 6).join(', ')}`)
  return lines.join('\n') || '(no preferences set)'
}

function formatRadarItems(radarItems) {
  return (radarItems || [])
    .slice(0, 14)
    .map((i) => {
      let line = `- "${i.title}"`
      if (i.creator) line += ` by ${i.creator}`
      line += ` (${i.type}`
      if (i.genre) line += `, ${i.genre}`
      if (i.releaseDate) line += `, released ${i.releaseDate}`
      line += ')'
      // Tastemaker picks carry real critical context — surface it so the
      // letter can cite the actual source instead of inventing a reason.
      if (i.source) line += `\n  · Critical context [${i.source}]: ${i.blurb || '(buzz noted, no summary)'}`
      else if (i.releaseDate) line += `\n  · New release (no critical writeup available)`
      if (i.reason) line += `\n  · Fits this reader because: ${i.reason}`
      return line
    })
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
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ fallback: true }) }
  }

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Invalid JSON' }) } }

  const { profile = {}, catalogItems = [], radarItems = [] } = body

  try {
    // --- Call 1: Taste profile summary ---
    const summarySystem = 'You are building a precise taste profile for a media lover. 2–3 sentences, specific, evidence-based. No filler phrases like "appears to enjoy" — just state what is true. Plain prose, no lists.'

    const summaryUser = `Catalog (recently finished, with ratings):
${formatCatalogForSummary(catalogItems) || '(no finished items yet)'}

Stated favorites:
${formatProfile(profile)}

Write a 2–3 sentence taste profile.`

    const profileSummary = await callClaude(apiKey, summarySystem, summaryUser, 300, 0.3)

    // --- Call 2: The letter ---
    const letterSystem = `You write the weekly cultural dispatch for Color Commentary, a media tracker for people with good taste. Voice: a sharp, well-read critic-friend — warm but not fawning, confident, specific. Think a culture columnist, not a hype machine.

This is a RECOMMENDATION DISPATCH about what's worth your attention this week.

HEADLINE ("greeting"):
- Write a real headline, like a column would have. Sentence case or title case, normal punctuation. It should end with a period, question mark, or nothing — NEVER a trailing comma, and NEVER all-lowercase.
- It should gesture at the week's actual picks or a through-line between them. NOT a generic salutation. Examples of the right register: "Three records worth clearing your week for." / "The buzziest novel of the month is also the strangest." / "A quiet week, but the quiet ones reward you." Do NOT use pet names like "you magnificent thing."

CITING SOURCES (critical):
- Several picks include real critical context from a named publication (Pitchfork, NYT Book Review, LitHub, The Cut, Rotten Tomatoes, Vulture, etc.). When a pick has this, CITE IT plainly: e.g. "Pitchfork singled it out for…" or "Per the NYT Book Review, …". Attribute the buzz to the source — that is the whole point of this dispatch.
- If a pick has NO critical context (just a new release), say something true about the work itself or note plainly that it's a fresh drop. Do NOT manufacture critical acclaim that wasn't given to you.

DO NOT FABRICATE TASTE CONNECTIONS:
- Do NOT invent connections to authors/artists/works the reader supposedly likes (e.g. "your proven taste for X's claustrophobic intelligence"). Only reference the reader's taste if it is explicitly in the sensibility summary below, and even then keep it light and general — at most one such aside in the whole letter.
- Better to say nothing about the reader than to fake a personal connection. Let the works carry the letter.

ONLY CHAMPION RAVES:
- Every featured pick is something you are genuinely recommending. Do NOT include anything you'd call skippable, mixed, divisive, or "fine." If a pick isn't worth an enthusiastic case, drop it and feature a stronger one.
- No noise, no filler, no "this one's not for everyone." The reader trusts this list to be the good stuff only.
- If a LitHub/NYT-raved book and a Certified-Fresh Rotten Tomatoes movie or show are in the list, feature them — those are the anchors.

- Each featured pick gets 2-3 sentences: what it is, what's being said about it (with the source), why it's worth the time.
- Under 320 words total.

Respond ONLY with a valid JSON object — no prose outside it, no markdown fences:
{"greeting":"string","paragraphs":["string","string","string"],"featuredTitles":["string"],"closing":"string"}`

    const letterUser = `This reader's sensibility (use sparingly, do not fabricate beyond this): ${profileSummary}

This week's picks. Items tagged with [Source] have real critical context — cite the source when you feature them. Pick 3–5 you can say something true and interesting about:
${formatRadarItems(radarItems) || '(no picks this week)'}

Write the dispatch. Bold titles with **title**. Under 320 words total. The "greeting" is a real headline (no trailing comma, not all-lowercase). "featuredTitles" must exactly match the titles you bolded.`

    const rawLetter = await callClaude(apiKey, letterSystem, letterUser, 1400, 0.85)
    const letterData = extractJSON(rawLetter)

    if (!letterData || !letterData.greeting || !Array.isArray(letterData.paragraphs)) {
      console.error('claude-radar-letter: unparseable response', rawLetter?.slice(0, 300))
      return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ fallback: true }) }
    }

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        greeting: String(letterData.greeting || '').slice(0, 300),
        paragraphs: (letterData.paragraphs || []).map((p) => String(p).slice(0, 800)).slice(0, 5),
        featuredTitles: (letterData.featuredTitles || []).map((t) => String(t)).slice(0, 8),
        closing: String(letterData.closing || '').slice(0, 300),
        weekLabel: currentWeekLabel(),
      }),
    }
  } catch (err) {
    console.error('claude-radar-letter error', err.message)
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ fallback: true }) }
  }
}
