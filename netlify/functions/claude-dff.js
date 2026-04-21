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
import { getSpotifyToken } from './_shared/spotifyAuth.js'

const MODEL = 'claude-haiku-4-5'

const SYSTEM = `You are a brilliant cultural companion with deep, genuine knowledge of music, film, TV, and books. You make recommendations the way a very well-read, well-watched friend does — following actual creative lineages, not genre tags.

Respond ONLY with a valid JSON object — no prose outside it, no markdown fences:
{
  "deeper": [{"title":"...","creator":"...","type":"music|movie|tv|book","reason":"..."}],
  "further": [{"title":"...","creator":"...","type":"music|movie|tv|book","reason":"..."}],
  "fresher": [{"title":"...","creator":"...","type":"music|movie|tv|book","reason":"..."}]
}

RULES:
1. Use your actual knowledge. For any TV show or film: who created/directed it? What is their other work? What movements, books, or music influenced the project? Follow THAT thread.
2. Do NOT make surface-level genre connections. "It's also a drama" or "also a reality show" is not a reason. That's lazy. Dig for the real creative DNA.
3. Do NOT recommend something just because it's well-known or popular in the same category.
4. Cross-media jumps are often the best recommendations. A novel that shares the same obsessions. A record that sounds like the film feels. A film that illuminates why you love a book.
5. The reason must state the ACTUAL CONNECTION — something specific and true about both works.
6. Do NOT default to the usual touchstones (Bluets, Parable of the Sower, Brokeback Mountain, The Road, etc.). If you find yourself reaching for a title you'd give everyone, stop — you are defaulting to a shortlist. Think specifically about THIS work.
7. Every item must be a fresh choice made for THIS specific title. If you catch yourself recommending the same work you'd suggest for a different item, replace it.

deeper (3 items): Trace the real creative lineage. The director's earlier film that established their style. The book or album the creator has cited as an influence. The movement or era this belongs to. The work that this one is in conversation with.

further (4 items): Neighboring works with genuine thematic or emotional resonance — not genre neighbors, spirit neighbors. Cross-media strongly encouraged.

fresher (3 items): Genuinely surprising lateral moves that someone who loved this would find delightful even if they seem unrelated at first. The connection must be real and specific — a shared obsession, structural similarity, or a conversation the two works are having across time.

Reason format: second person, under 20 words, state the actual specific connection — not "you might enjoy" but what the real link is.`

async function fetchCoverUrl(title, creator, type, spotifyToken, tmdbKey) {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 3000)
  try {
    if (type === 'music' && spotifyToken) {
      const q = encodeURIComponent(`${title}${creator ? ' ' + creator : ''}`)
      const r = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=album&limit=1`, {
        headers: { Authorization: `Bearer ${spotifyToken}` },
        signal: controller.signal,
      })
      if (r.ok) {
        const d = await r.json()
        const album = d.albums?.items?.[0]
        return album?.images?.[1]?.url || album?.images?.[0]?.url || ''
      }
    } else if ((type === 'movie' || type === 'tv') && tmdbKey) {
      const endpoint = type === 'movie' ? 'search/movie' : 'search/tv'
      const r = await fetch(
        `https://api.themoviedb.org/3/${endpoint}?api_key=${tmdbKey}&query=${encodeURIComponent(title)}&include_adult=false`,
        { signal: controller.signal }
      )
      if (r.ok) {
        const d = await r.json()
        const it = d.results?.[0]
        return it?.poster_path ? `https://image.tmdb.org/t/p/w200${it.poster_path}` : ''
      }
    } else if (type === 'book') {
      const q = encodeURIComponent(`${title}${creator ? ' ' + creator : ''}`)
      const r = await fetch(
        `https://openlibrary.org/search.json?q=${q}&fields=cover_i,isbn&limit=1`,
        { signal: controller.signal }
      )
      if (r.ok) {
        const d = await r.json()
        const doc = d.docs?.[0]
        if (doc?.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        const isbn = doc?.isbn?.[0]
        if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
      }
    }
  } catch {
    // Cover art is best-effort — silently skip
  } finally {
    clearTimeout(tid)
  }
  return ''
}

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
    coverUrl: typeof s.coverUrl === 'string' ? s.coverUrl.slice(0, 500) : '',
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

    // Fetch cover art for all suggestions in parallel (best-effort, 3s timeout each)
    const tmdbKey = process.env.VITE_TMDB_API_KEY || process.env.TMDB_API_KEY
    let spotifyToken = null
    const allSugs = [...(parsed.deeper || []), ...(parsed.further || []), ...(parsed.fresher || [])]
    if (allSugs.some((s) => s?.type === 'music')) {
      try { spotifyToken = await getSpotifyToken() } catch {}
    }

    const enrich = (suggestions) =>
      Promise.all((suggestions || []).map(async (s) => {
        const coverUrl = await fetchCoverUrl(s?.title || '', s?.creator || '', s?.type, spotifyToken, tmdbKey)
        return { ...s, coverUrl }
      }))

    const [deeperRaw, furtherRaw, fresherRaw] = await Promise.all([
      enrich(parsed.deeper),
      enrich(parsed.further),
      enrich(parsed.fresher),
    ])

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        deeper: deeperRaw.map(validateSuggestion).filter(Boolean).slice(0, 4),
        further: furtherRaw.map(validateSuggestion).filter(Boolean).slice(0, 5),
        fresher: fresherRaw.map(validateSuggestion).filter(Boolean).slice(0, 4),
      }),
    }
  } catch (err) {
    console.error('claude-dff error', err.message)
    return { statusCode: 500, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Internal error' }) }
  }
}
