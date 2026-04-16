/**
 * Claude-powered note parser
 * Takes freeform text, returns structured media items using Claude Haiku.
 * Env var required: ANTHROPIC_API_KEY
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'

const MODEL = 'claude-haiku-4-5'
const MAX_INPUT = 4000

const SYSTEM_PROMPT = `You extract structured media items from freeform notes about things the user is listening to, watching, or reading. Respond ONLY with a JSON object matching this schema, no prose, no markdown fences:

{ "items": [
  { "type": "music" | "movie" | "tv" | "book",
    "title": string,
    "creator": string | null,
    "year": number | null,
    "rating": number | null,
    "notes": string | null,
    "section": "listening" | "watching" | "reading" | "discovered",
    "confidence": "high" | "medium" | "low"
  } ]
}

Rules:
- section mapping: music→listening, movie/tv→watching, book→reading, anything uncertain→discovered.
- "creator" is the artist/director/showrunner/author.
- If the user names a work you recognize, fill in year and creator even if they didn't say them. Mark confidence "high" only when you're confident about the title+creator pair. "medium" if you're reasonably sure, "low" for guesses.
- If the text is ambiguous about what was meant, return confidence "low" with your best guess.
- "rating": infer from phrases. "5/5", "loved it", "amazing" → 5. "4/5", "really good" → 4. "3/5", "solid", "fine" → 3. "2/5", "meh" → 2. "1/5", "hated it", "terrible" → 1. If unclear, null.
- Preserve the user's short reaction in "notes" (≤120 chars, verbatim if possible).
- If no media items are mentioned, return {"items": []}.
- Do NOT invent items that aren't implied by the text.`

function extractJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text) } catch {}
  // Try to find a JSON object in the text
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }
  return null
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return []
  const validTypes = ['music', 'movie', 'tv', 'book']
  const validSections = ['listening', 'watching', 'reading', 'discovered']
  const validConfidence = ['high', 'medium', 'low']

  return items
    .filter(item => item && typeof item === 'object' && typeof item.title === 'string' && item.title.trim())
    .map(item => ({
      type: validTypes.includes(item.type) ? item.type : 'movie',
      title: String(item.title).trim().slice(0, 200),
      creator: typeof item.creator === 'string' ? item.creator.trim().slice(0, 200) : null,
      year: typeof item.year === 'number' && item.year > 1800 && item.year < 2100 ? item.year : null,
      rating: typeof item.rating === 'number' && item.rating >= 1 && item.rating <= 5 ? Math.round(item.rating) : null,
      notes: typeof item.notes === 'string' ? item.notes.trim().slice(0, 120) : null,
      section: validSections.includes(item.section) ? item.section : 'discovered',
      confidence: validConfidence.includes(item.confidence) ? item.confidence : 'medium',
    }))
    .slice(0, 15)
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || ''

  if (event.httpMethod === 'OPTIONS') return handleOptions(origin)
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders(origin), body: JSON.stringify({ error: 'AI parsing not configured on server' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const text = (body.text || '').trim()
  if (!text) {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'No text provided' }) }
  }
  if (text.length > MAX_INPUT) {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: `Text exceeds ${MAX_INPUT} characters` }) }
  }

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
        max_tokens: 1024,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      }),
    })

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '')
      console.error('Anthropic API error', res.status, errTxt.slice(0, 200))
      return { statusCode: 502, headers: corsHeaders(origin), body: JSON.stringify({ error: 'AI service unavailable' }) }
    }

    const data = await res.json()
    const content = data.content?.[0]?.text || ''
    const parsed = extractJSON(content)
    if (!parsed) {
      return { statusCode: 502, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Could not parse AI response', items: [] }) }
    }

    const items = sanitizeItems(parsed.items)
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({ items }),
    }
  } catch (err) {
    console.error('claude-parse error', err.message)
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'Internal error' }),
    }
  }
}
