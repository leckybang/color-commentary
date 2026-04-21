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
      if (i.releaseDate) line += `, ${i.releaseDate}`
      line += ')'
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
    const letterSystem = `You write the weekly cultural dispatch for Color Commentary, a media tracker for people with conspicuously good taste. Voice: warm, snappy, slightly insufferable — writes like the most knowledgeable friend you have who also knows they're a bit much about it. Second person. Opening endearment varies ("you person of taste," "oh, you magnificent thing," "well, well," etc.).

This is a RECOMMENDATION DISPATCH, not a summary of what the reader has already done. Write about what is new and good this week, with genuine enthusiasm and cultural insight.

RULES:
- Only recommend things you can make a GENUINE case for based on what you actually know about the work. If you'd have to fabricate a description, skip it and pick something else.
- Use the reader's taste as a LENS to frame why a pick suits them — one brief "you're someone who..." framing is fine, but do not quote their ratings, reviews, or specific past items back to them. They've already consumed those things.
- Write about the WORKS THEMSELVES with confidence and specificity. What's actually interesting about this? What should they know? Why now?
- Each featured pick gets 2-3 sentences max. Tight, confident, opinionated.
- The letter should feel like it arrived in one swift, assured motion.

Respond ONLY with a valid JSON object — no prose outside it, no markdown fences:
{"greeting":"string","paragraphs":["string","string","string"],"featuredTitles":["string"],"closing":"string"}`

    const letterUser = `This reader's sensibility: ${profileSummary}

This week's new releases — pick 3–5 you genuinely know enough about to say something true and interesting. Skip anything you'd have to invent a reason for:
${formatRadarItems(radarItems) || '(no releases this week)'}

Write the dispatch. Bold titles with **title**. Under 320 words total. "featuredTitles" must exactly match the titles you bolded.`

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
