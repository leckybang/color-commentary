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

// --- Genre lookup (cached in-module) ---
const genreCache = { movie: null, tv: null }

async function getGenreMap(type, signal) {
  if (genreCache[type]) return genreCache[type]
  try {
    const url = `${BASE}/genre/${type}/list?api_key=${TMDB_API_KEY}&language=en-US`
    const res = await fetch(url, { signal })
    if (!res.ok) return {}
    const data = await res.json()
    const map = Object.fromEntries((data.genres || []).map((g) => [g.id, g.name]))
    genreCache[type] = map
    return map
  } catch {
    return {}
  }
}

function toRadarItem(tmdb, rawItem, genreMap, { extra } = {}) {
  const type = tmdb.media_type === 'tv' || rawItem?.first_air_date ? 'tv' : 'movie'
  const mediaType = type
  const title = tmdb.title || tmdb.name || ''
  const releaseDate = tmdb.release_date || tmdb.first_air_date || ''
  const genreNames = (tmdb.genre_ids || []).map((id) => genreMap[id]).filter(Boolean)
  return {
    title,
    creator: '', // TMDB list endpoints don't include director; left blank
    type: mediaType,
    genre: genreNames[0] || '',
    releaseDate,
    description: tmdb.overview || '',
    coverUrl: tmdb.poster_path ? `${IMG_BASE}${tmdb.poster_path}` : '',
    provider: 'tmdb',
    externalId: String(tmdb.id),
    ...extra,
  }
}

export async function fetchTMDBNewReleases({ signal } = {}) {
  if (!TMDB_API_KEY) return []
  try {
    const [movieRes, upcomingRes, tvRes, movieGenres, tvGenres] = await Promise.all([
      fetch(`${BASE}/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1&region=US`, { signal }),
      fetch(`${BASE}/movie/upcoming?api_key=${TMDB_API_KEY}&language=en-US&page=1&region=US`, { signal }),
      fetch(`${BASE}/tv/on_the_air?api_key=${TMDB_API_KEY}&language=en-US&page=1`, { signal }),
      getGenreMap('movie', signal),
      getGenreMap('tv', signal),
    ])
    const movies = movieRes.ok ? (await movieRes.json()).results || [] : []
    const upcoming = upcomingRes.ok ? (await upcomingRes.json()).results || [] : []
    const tv = tvRes.ok ? (await tvRes.json()).results || [] : []

    const movieItems = [...movies, ...upcoming]
      .map((m) => toRadarItem({ ...m, media_type: 'movie' }, m, movieGenres))
      .filter((i) => i.title)
    const tvItems = tv
      .map((t) => toRadarItem({ ...t, media_type: 'tv' }, t, tvGenres))
      .filter((i) => i.title)

    return [...movieItems, ...tvItems]
  } catch (err) {
    if (err.name !== 'AbortError') console.error('TMDB new releases failed', err)
    return []
  }
}

export async function fetchTMDBDiscoveries(tasteGenres = [], { signal } = {}) {
  if (!TMDB_API_KEY) return []
  try {
    const [movieGenres, tvGenres] = await Promise.all([getGenreMap('movie', signal), getGenreMap('tv', signal)])
    const lowerTaste = tasteGenres.map((g) => g.toLowerCase())
    const matchIds = (map) =>
      Object.entries(map)
        .filter(([, name]) => lowerTaste.some((t) => name.toLowerCase().includes(t) || t.includes(name.toLowerCase())))
        .map(([id]) => id)
    const movieIds = matchIds(movieGenres).slice(0, 2).join(',')
    const tvIds = matchIds(tvGenres).slice(0, 2).join(',')

    const movieUrl = `${BASE}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&page=1${movieIds ? `&with_genres=${movieIds}` : ''}`
    const tvUrl = `${BASE}/discover/tv?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&page=1${tvIds ? `&with_genres=${tvIds}` : ''}`

    const [movieRes, tvRes] = await Promise.all([fetch(movieUrl, { signal }), fetch(tvUrl, { signal })])
    const movies = movieRes.ok ? (await movieRes.json()).results || [] : []
    const tv = tvRes.ok ? (await tvRes.json()).results || [] : []

    const reason = tasteGenres[0] ? `Popular in ${tasteGenres[0]}` : 'Trending this week'
    const movieItems = movies
      .map((m) => toRadarItem({ ...m, media_type: 'movie' }, m, movieGenres, { extra: { reason } }))
      .filter((i) => i.title)
    const tvItems = tv
      .map((t) => toRadarItem({ ...t, media_type: 'tv' }, t, tvGenres, { extra: { reason } }))
      .filter((i) => i.title)

    return [...movieItems, ...tvItems]
  } catch (err) {
    if (err.name !== 'AbortError') console.error('TMDB discoveries failed', err)
    return []
  }
}
