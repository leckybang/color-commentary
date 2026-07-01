/**
 * media-detail — fast, factual info for a single catalog item.
 *
 * Replaces the slow Claude "Deeper / Further / Wild Card" panel. Hits the same
 * free providers the rest of the app uses (TMDB, Google Books, Spotify) and
 * returns, with no LLM call:
 *   { description, rating: {label, pct}|null, related: [{title, creator, type, coverUrl, note}] }
 *
 * Env: VITE_TMDB_API_KEY (movies/TV), VITE_GOOGLE_BOOKS_API_KEY (books, optional),
 *      SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET (music, via _shared/spotifyAuth).
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'
import { getSpotifyToken } from './_shared/spotifyAuth.js'

const TMDB_KEY = process.env.VITE_TMDB_API_KEY || process.env.TMDB_API_KEY
const GBOOKS_KEY = process.env.VITE_GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_BOOKS_API_KEY
const TMDB_IMG = 'https://image.tmdb.org/t/p/w200'
const MAX_RELATED = 6

// Trim to a length but end on a sentence/word boundary with an ellipsis, so
// descriptions never cut off mid-word.
function clip(s, n = 700) {
  if (typeof s !== 'string') return ''
  const t = s.trim()
  if (t.length <= n) return t
  const slice = t.slice(0, n)
  const lastSentence = slice.lastIndexOf('. ')
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSentence > n * 0.6 ? lastSentence + 1 : (lastSpace > 0 ? lastSpace : n)
  return t.slice(0, cut).trim().replace(/[.,;:\s]+$/, '') + '…'
}

// Normalize a title for dedup: drop parentheticals, edition suffixes, and
// punctuation so "American Hagwon" and "American Hagwon Hb" collapse, and
// remaster/deluxe re-releases of the same album fold together.
function normTitle(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/\b(hb|pb|hardback|paperback|hardcover|deluxe|remaster(ed)?|expanded|edition|version)\b/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Pick related works, skipping the original and near-duplicate editions.
function dedupeRelated(candidates, originalTitle, max) {
  const origNorm = normTitle(originalTitle)
  const seen = new Set()
  const out = []
  for (const c of candidates) {
    const norm = normTitle(c.title)
    if (!norm || seen.has(norm)) continue
    // Skip the item itself. Also skip re-releases that embed the title
    // (e.g. "Pachinko (NBA Finalist)"), but only for titles long enough that
    // a substring match is meaningful — otherwise short titles ("It", "Dune")
    // would wrongly filter unrelated works.
    if (origNorm && (norm === origNorm || (origNorm.length >= 5 && norm.includes(origNorm)))) continue
    seen.add(norm)
    out.push(c)
    if (out.length >= max) break
  }
  return out
}

async function getJson(url, opts) {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 5000)
  try {
    const r = await fetch(url, { ...opts, signal: controller.signal })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  } finally {
    clearTimeout(tid)
  }
}

// ─── Movies / TV (TMDB) ───
async function tmdbDetail(item) {
  if (!TMDB_KEY) return null
  const kind = item.type === 'tv' ? 'tv' : 'movie'
  const search = await getJson(
    `https://api.themoviedb.org/3/search/${kind}?api_key=${TMDB_KEY}&query=${encodeURIComponent(item.title)}&include_adult=false&language=en-US`
  )
  const hit = search?.results?.[0]
  if (!hit) return { description: '', rating: null, related: [] }

  const rec = await getJson(
    `https://api.themoviedb.org/3/${kind}/${hit.id}/recommendations?api_key=${TMDB_KEY}&language=en-US`
  )
  const related = (rec?.results || []).slice(0, MAX_RELATED).map((r) => ({
    title: r.title || r.name || '',
    creator: '',
    type: kind,
    coverUrl: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : '',
    note: 'Recommended if you liked this',
  })).filter((r) => r.title)

  const vote = hit.vote_average || 0
  const rating = vote > 0
    ? { label: `${Math.round(vote * 10)}% · TMDB`, pct: Math.round(vote * 10) }
    : null

  return { description: clip(hit.overview), rating, related }
}

// ─── Books (Google Books) ───
async function booksDetail(item) {
  const keyParam = GBOOKS_KEY ? `&key=${GBOOKS_KEY}` : ''
  const q = `intitle:${item.title}${item.creator ? `+inauthor:${item.creator}` : ''}`
  // Pull a few editions so we can pick the one with the richest metadata —
  // averageRating and description are sparse and edition-dependent.
  const search = await getJson(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5${keyParam}`
  )
  const editions = (search?.items || []).map((b) => b.volumeInfo).filter(Boolean)
  if (editions.length === 0) return { description: '', rating: null, related: [] }

  const vi = editions[0]
  const withDesc = editions.find((v) => v.description) || vi
  const withRating = editions.find((v) => v.averageRating > 0)

  // Authoritative author: trust the user's own creator field first (it's the
  // book they actually logged), then the described edition's author. Google
  // Books' first hit can be a wrong same-title book, which is what produced
  // bogus "More by <stranger>" lists.
  const author = (item.creator && item.creator.trim())
    || (withDesc.authors && withDesc.authors[0])
    || (vi.authors && vi.authors[0])
    || ''
  let related = []
  if (author) {
    const more = await getJson(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`inauthor:"${author}"`)}&maxResults=20&orderBy=relevance${keyParam}`
    )
    const authorNorm = author.toLowerCase()
    const candidates = (more?.items || [])
      .map((b) => b.volumeInfo)
      .filter((v) => v && v.title)
      // inauthor: is fuzzy and leaks other people's books — keep only volumes
      // actually credited to this author.
      .filter((v) => (v.authors || []).some((a) => {
        const an = a.toLowerCase()
        return an.includes(authorNorm) || authorNorm.includes(an)
      }))
      .map((v) => ({
        title: v.title,
        creator: (v.authors && v.authors[0]) || author,
        type: 'book',
        coverUrl: v.imageLinks?.thumbnail?.replace('http://', 'https://') || '',
        note: `More by ${author}`,
      }))
    related = dedupeRelated(candidates, item.title, MAX_RELATED)
  }

  const avg = withRating?.averageRating || 0
  const rating = avg > 0 ? { label: `${avg.toFixed(1)}/5 · readers`, pct: Math.round((avg / 5) * 100) } : null

  return { description: clip(withDesc.description), rating, related }
}

// ─── Music (Spotify) ───
async function musicDetail(item) {
  let token
  try { token = await getSpotifyToken() } catch { return { description: '', rating: null, related: [] } }
  const auth = { headers: { Authorization: `Bearer ${token}` } }

  const q = `${item.title}${item.creator ? ` ${item.creator}` : ''}`
  const search = await getJson(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=1`,
    auth
  )
  const album = search?.albums?.items?.[0]
  if (!album) return { description: '', rating: null, related: [] }

  const artist = album.artists?.[0]
  let related = []
  if (artist?.id) {
    // NB: this app's Spotify credentials reject limit>10 ("Invalid limit"),
    // so keep it at 10 — plenty after deduping editions/re-releases.
    const albums = await getJson(
      `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album,single&limit=10&market=US`,
      auth
    )
    const candidates = (albums?.items || []).map((a) => ({
      title: a.name,
      creator: a.artists?.[0]?.name || artist.name,
      type: 'music',
      coverUrl: a.images?.[1]?.url || a.images?.[0]?.url || '',
      note: `More from ${artist.name}`,
    }))
    related = dedupeRelated(candidates, album.name, MAX_RELATED)
  }

  // Spotify exposes no album description or critic rating.
  const description = artist?.name ? `Album by ${artist.name}.` : ''
  return { description, rating: null, related }
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || ''
  if (event.httpMethod === 'OPTIONS') return handleOptions(origin)
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Invalid JSON' }) } }

  const item = body.item
  if (!item?.title || !item?.type) {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Missing item.title/type' }) }
  }

  try {
    let result
    if (item.type === 'movie' || item.type === 'tv') result = await tmdbDetail(item)
    else if (item.type === 'book') result = await booksDetail(item)
    else if (item.type === 'music') result = await musicDetail(item)
    else result = { description: '', rating: null, related: [] }

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify(result || { description: '', rating: null, related: [] }),
    }
  } catch (err) {
    console.error('media-detail error', err.message)
    return { statusCode: 500, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Internal error' }) }
  }
}
