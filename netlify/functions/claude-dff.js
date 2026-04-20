/**
 * Claude-powered Deeper / Further / Fresher recommendations.
 *
 * Given a single catalog item, returns three curated suggestion sets:
 *   deeper  — context, influences, companion works for this exact item
 *   further — neighboring works across any medium with the same vibe
 *   fresher — challenging pushes that grow from what this person loves
 *
 * Env var required: ANTHROPIC_API_KEY
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'

const MODEL = 'claude-haiku-4-5'

const SYSTEM = `You are a cultural recommendation engine for someone with discerning taste.

Respond ONLY with a valid JSON object — no prose outside it, no markdown fences:
{
  "deeper": [{"title":"...","creator":"...","type":"music|movie|tv|book","reason":"..."}],
  "further": [{"title":"...","creator":"...","type":"music|movie|tv|book","reason":"..."}],
  "fresher": [{"title":"...","creator":"...","type":"music|movie|tv|book","reason":"..."}]
}

deeper: 3 items — context, influences, or companion works that illuminate the item. Things that complete or explain it (e.g. the album that inspired it, the book the film was based on, the director's earlier work).
further: 4 items — neighboring works across any medium. Same emotional register, different world. Cross-media encouraged.
fresher: 3 items — interesting next steps that challenge or grow from this person's taste. The surprising pick, not the obvious one.

Reason format: second person, under 15 words, specific — say WHY, not just "you might enjoy this."`

function extractJSON(text) {
  try { return JSON.parse(text) } catch {}
  const match = text.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  return null
}

const VALID_TYPES = new Set(['music', 'movie', 'tv', 'book'])

function validateSuggestion(s) {
  if (!s || typeof s !== 'object' || !s.title) return null
  return {
    title: String(s.title).trim().slice(0, 200),
    creator: typeof s.creator === 'string' ? s.creator.trim().slice(0, 200) : '',
    type: VALID_TYPES.has(s.type) ? s.type : 'movie',
    reason: typeof s.reason === 'string' ? s.reason.trim().slice(0, 200) : '',
  }
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || ''
  if (event.httpMethod === 'OPTIONS') return handleOptions(origin)
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Not configured' }) }
  }

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Invalid JSON' }) } }

  const item = body.item
  if (!item?.title) {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Missing item.title' }) }
  }

  const ratingStr = item.rating > 0 ? ` — rated ${item.rating}/5` : ''
  const reviewStr = item.review ? `\nTheir notes: "${item.review.slice(0, 250)}"` : ''
  const genreStr = item.genre ? `, ${item.genre}` : ''
  const creatorStr = item.creator ? ` by ${item.creator}` : ''

  const prompt = `Item: "${item.title}"${creatorStr} — ${item.type}${genreStr}${ratingStr}${reviewStr}

Generate Deeper (3 items), Further (4 items), and Fresher (3 items) recommendations.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1400,
        temperature: 0.75,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error('claude-dff upstream error', res.status, err.slice(0, 120))
      return { statusCode: 502, headers: corsHeaders(origin), body: JSON.stringify({ error: 'AI service unavailable' }) }
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const parsed = extractJSON(text)

    if (!parsed) {
      console.error('claude-dff: unparseable response', text?.slice(0, 300))
      return { statusCode: 502, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Could not parse response' }) }
    }

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        deeper: (parsed.deeper || []).map(validateSuggestion).filter(Boolean).slice(0, 4),
        further: (parsed.further || []).map(validateSuggestion).filter(Boolean).slice(0, 5),
        fresher: (parsed.fresher || []).map(validateSuggestion).filter(Boolean).slice(0, 4),
      }),
    }
  } catch (err) {
    console.error('claude-dff error', err.message)
    return { statusCode: 500, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Internal error' }) }
  }
}
