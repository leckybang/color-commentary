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

function normalizeListItem(item, type) {
  if (!item) return null
  const rawDate = item.release_date || item.first_air_date || ''
  return {
    type,
    provider: 'tmdb',
    externalId: String(item.id),
    title: item.title || item.name || '',
    creator: '',
    genre: '',
    releaseDate: rawDate,
    coverUrl: item.poster_path ? `${IMG_BASE}${item.poster_path}` : '',
    description: item.overview || '',
    isNewRelease: true,
  }
}

async function fetchTMDBList(path, type, { signal } = {}) {
  if (!TMDB_API_KEY) return []
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}&language=en-US&page=1`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).map((item) => normalizeListItem(item, type)).filter(Boolean)
  } catch (err) {
    if (err.name !== 'AbortError') console.error('TMDB list failed', path, err)
    return []
  }
}

/**
 * Recent + upcoming movies. Merges `now_playing` and `upcoming` so users see
 * both what's in theaters and what's landing soon.
 */
export async function fetchTMDBNewMovies(limit = 10, { signal } = {}) {
  const [nowPlaying, upcoming] = await Promise.all([
    fetchTMDBList('/movie/now_playing', 'movie', { signal }),
    fetchTMDBList('/movie/upcoming', 'movie', { signal }),
  ])
  const byId = new Map()
  for (const item of [...nowPlaying, ...upcoming]) {
    if (!byId.has(item.externalId)) byId.set(item.externalId, item)
  }
  return Array.from(byId.values()).slice(0, limit)
}

/**
 * Currently-airing TV plus popular/upcoming discoveries.
 */
export async function fetchTMDBNewTV(limit = 10, { signal } = {}) {
  const [onAir, discover] = await Promise.all([
    fetchTMDBList('/tv/on_the_air', 'tv', { signal }),
    fetchTMDBList('/discover/tv?sort_by=first_air_date.desc&first_air_date.lte=' + new Date().toISOString().slice(0, 10), 'tv', { signal }),
  ])
  const byId = new Map()
  for (const item of [...onAir, ...discover]) {
    if (!byId.has(item.externalId)) byId.set(item.externalId, item)
  }
  return Array.from(byId.values()).slice(0, limit)
}
