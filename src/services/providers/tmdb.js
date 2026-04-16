/**
 * TMDB (The Movie Database) search provider
 * Docs: https://developer.themoviedb.org/docs
 * Key is client-safe — TMDB v3 keys are intended for browser use.
 */

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p/w200'

export const isTMDBConfigured = !!TMDB_API_KEY

function normalizeTMDB(item) {
  if (!item || !['movie', 'tv'].includes(item.media_type)) return null
  const type = item.media_type === 'tv' ? 'tv' : 'movie'
  const title = item.title || item.name || ''
  const rawDate = item.release_date || item.first_air_date || ''
  return {
    kind: 'media',
    provider: 'tmdb',
    externalId: String(item.id),
    type,
    title,
    creator: '', // TMDB /search/multi doesn't include director; we could enrich later
    year: rawDate.slice(0, 4),
    coverUrl: item.poster_path ? `${IMG_BASE}${item.poster_path}` : '',
    overview: item.overview || '',
  }
}

export async function searchTMDB(query, { signal } = {}) {
  if (!TMDB_API_KEY) return []
  if (!query || query.trim().length < 2) return []

  const url = `${BASE}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || [])
      .map(normalizeTMDB)
      .filter(Boolean)
      .slice(0, 8)
  } catch (err) {
    if (err.name !== 'AbortError') console.error('TMDB search failed', err)
    return []
  }
}
