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
    popularity: item.popularity || 0,
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

function toISODate(d) {
  return d.toISOString().slice(0, 10)
}

function daysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toISODate(d)
}

function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/**
 * Buzzy new movies — released in the last ~45 days or landing in the next
 * ~30. Filtered by vote count so we skip obscure/amateur uploads and sorted
 * by popularity so the biggest recent drops float to the top.
 */
export async function fetchTMDBNewMovies(limit = 10, { signal } = {}) {
  const from = daysAgo(45)
  const to = daysFromNow(30)
  const path =
    `/discover/movie` +
    `?primary_release_date.gte=${from}` +
    `&primary_release_date.lte=${to}` +
    `&sort_by=popularity.desc` +
    `&vote_count.gte=20` +
    `&with_release_type=2|3` + // theatrical + theatrical-limited
    `&region=US`
  const results = await fetchTMDBList(path, 'movie', { signal })
  return results.slice(0, limit)
}

/**
 * Buzzy new TV — shows whose series premiered within the last ~120 days.
 *
 * We intentionally avoid `/tv/on_the_air` because it includes decades-old
 * warhorses (Law & Order, NCIS) that are still airing new episodes. Filtering
 * on `first_air_date` means we only surface actual new series this season.
 */
export async function fetchTMDBNewTV(limit = 10, { signal } = {}) {
  const from = daysAgo(120)
  const to = toISODate(new Date())
  const path =
    `/discover/tv` +
    `?first_air_date.gte=${from}` +
    `&first_air_date.lte=${to}` +
    `&sort_by=popularity.desc` +
    `&vote_count.gte=10`
  const results = await fetchTMDBList(path, 'tv', { signal })
  return results.slice(0, limit)
}
