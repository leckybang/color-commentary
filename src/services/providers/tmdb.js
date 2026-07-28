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

/**
 * A person's best-known works, via /search/person. Used to turn taste picks
 * like "Greta Gerwig" into addable movies (the multi-search normalizer drops
 * person results, so a plain searchTMDB on a director name finds nothing).
 */
export async function searchTMDBKnownFor(personName, { signal } = {}) {
  if (!TMDB_API_KEY) return []
  if (!personName || personName.trim().length < 2) return []
  const url = `${BASE}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(personName)}&include_adult=false&language=en-US&page=1`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = await res.json()
    const person = (data.results || [])[0]
    return (person?.known_for || [])
      .map(normalizeTMDB)
      .filter(Boolean)
      .map((item) => ({ ...item, creator: item.creator || person.name }))
  } catch (err) {
    if (err.name !== 'AbortError') console.error('TMDB person search failed', err)
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
    voteAverage: typeof item.vote_average === 'number' ? item.vote_average : 0,
    voteCount: typeof item.vote_count === 'number' ? item.vote_count : 0,
    isNewRelease: true,
  }
}

async function fetchTMDBList(path, type, { signal, page = 1 } = {}) {
  if (!TMDB_API_KEY) return []
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
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
 * Pull several pages of a list at once. The radar rotates its picks weekly,
 * which only works if there's a pool deeper than one page to rotate through.
 */
async function fetchTMDBPages(path, type, pages, { signal } = {}) {
  const batches = await Promise.all(
    Array.from({ length: pages }, (_, i) => fetchTMDBList(path, type, { signal, page: i + 1 }))
  )
  const seen = new Set()
  const out = []
  for (const item of batches.flat()) {
    if (!item.externalId || seen.has(item.externalId)) continue
    seen.add(item.externalId)
    out.push(item)
  }
  return out
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
 * Buzzy new movies — out in the last ~60 days. The window used to run 30 days
 * INTO the future, which meant unreleased films were labelled "Just released"
 * on the radar. Anything still ahead of us belongs in Coming Soon now.
 *
 * Filtered by vote count so we skip obscure/amateur uploads and sorted by
 * popularity so the biggest recent drops float to the top.
 */
export async function fetchTMDBNewMovies(limit = 10, { signal } = {}) {
  const from = daysAgo(60)
  const to = toISODate(new Date())
  const path =
    `/discover/movie` +
    `?primary_release_date.gte=${from}` +
    `&primary_release_date.lte=${to}` +
    `&sort_by=popularity.desc` +
    `&vote_count.gte=20` +
    `&with_release_type=2|3` + // theatrical + theatrical-limited
    `&region=US`
  const results = await fetchTMDBPages(path, 'movie', 2, { signal })
  return results.slice(0, limit)
}

/**
 * Not out yet — the next ~120 days of theatrical releases.
 *
 * Deliberately does NOT filter on vote count: an unreleased film has no
 * ratings by definition, so the usual quality gate would empty the list. A
 * poster is the proxy instead — TMDB entries with real marketing behind them
 * have art, placeholder stubs don't.
 */
export async function fetchTMDBUpcomingMovies(limit = 10, { signal } = {}) {
  const from = daysFromNow(1)
  const to = daysFromNow(120)
  const path =
    `/discover/movie` +
    `?primary_release_date.gte=${from}` +
    `&primary_release_date.lte=${to}` +
    `&sort_by=popularity.desc` +
    `&with_release_type=2|3` +
    `&region=US`
  const results = await fetchTMDBPages(path, 'movie', 2, { signal })
  return results.filter((m) => m.coverUrl).slice(0, limit)
}

/** Series premiering in the next ~120 days. Same no-votes-yet logic as above. */
export async function fetchTMDBUpcomingTV(limit = 10, { signal } = {}) {
  const from = daysFromNow(1)
  const to = daysFromNow(120)
  const path =
    `/discover/tv` +
    `?first_air_date.gte=${from}` +
    `&first_air_date.lte=${to}` +
    `&sort_by=popularity.desc`
  const results = await fetchTMDBPages(path, 'tv', 2, { signal })
  return results.filter((t) => t.coverUrl).slice(0, limit)
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
  const results = await fetchTMDBPages(path, 'tv', 2, { signal })
  return results.slice(0, limit)
}

/**
 * Fetch credits for a TMDB movie or show. Returns:
 *   { creator: string, cast: string[] }
 * For movies, creator = director(s). For TV, creator = created_by names.
 * Cast is the top ~3 billed names. Empty values on failure.
 */
export async function fetchTMDBCredits(id, type, { signal } = {}) {
  if (!TMDB_API_KEY || !id) return { creator: '', cast: [] }
  const path = type === 'tv' ? `/tv/${id}` : `/movie/${id}`
  // Single combined call: /movie/{id}?append_to_response=credits gets details
  // (including `created_by` for TV) plus the credits in one request.
  const url = `${BASE}${path}?api_key=${TMDB_API_KEY}&append_to_response=credits&language=en-US`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return { creator: '', cast: [] }
    const data = await res.json()
    let creator = ''
    if (type === 'tv') {
      creator = (data.created_by || []).map((c) => c.name).filter(Boolean).join(', ')
    } else {
      const directors = (data.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => c.name)
      creator = directors.join(', ')
    }
    const cast = (data.credits?.cast || []).slice(0, 3).map((c) => c.name).filter(Boolean)
    return { creator, cast }
  } catch (err) {
    if (err.name !== 'AbortError') console.warn('TMDB credits failed', id, err.message)
    return { creator: '', cast: [] }
  }
}
