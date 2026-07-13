/**
 * Google Books search provider
 * Docs: https://developers.google.com/books/docs/v1/using
 * Works without a key but gets aggressively rate-limited (429).
 * Add VITE_GOOGLE_BOOKS_API_KEY to unlock the full quota (free, 1000 req/day).
 */

const BASE = 'https://www.googleapis.com/books/v1'
const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

function normalizeBook(item) {
  if (!item || !item.volumeInfo) return null
  const vi = item.volumeInfo
  const cover = vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail || ''

  // When Google Books has no image, fall back to OpenLibrary's covers API using
  // the book's ISBN — it has far broader coverage than Google's image index.
  let coverUrl = cover ? cover.replace(/^http:\/\//, 'https://') : ''
  if (!coverUrl) {
    const ids = vi.industryIdentifiers || []
    const isbn =
      ids.find((id) => id.type === 'ISBN_13')?.identifier ||
      ids.find((id) => id.type === 'ISBN_10')?.identifier
    if (isbn) coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
  }

  return {
    kind: 'media',
    provider: 'googlebooks',
    externalId: item.id,
    type: 'book',
    title: vi.title || '',
    creator: (vi.authors || []).join(', '),
    year: (vi.publishedDate || '').slice(0, 4),
    coverUrl,
    overview: vi.description || '',
  }
}

async function fetchVolumes(q, { signal } = {}) {
  const keyParam = API_KEY ? `&key=${API_KEY}` : ''
  const url = `${BASE}/volumes?q=${encodeURIComponent(q)}&maxResults=12&printType=books&langRestrict=en${keyParam}`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('Google Books rate-limited. Add VITE_GOOGLE_BOOKS_API_KEY to your env vars.')
      }
      return []
    }
    const data = await res.json()
    return data.items || []
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Google Books search failed', err)
    return []
  }
}

// Titles from the summary mills — "(Book Analysis)", study guides, workbooks —
// technically match but are never what someone is trying to catalog.
const JUNK_TITLE = /book analysis|summary of|study guide|conversation starters|workbook|sparknotes|in \d+ minutes/i

/**
 * Score how likely this is a book people actually read, vs. a digitized 1873
 * sermon or an academic scan. Google's raw relevance ranks those highly for
 * name-like queries; real books have covers, publishers, descriptions, and
 * post-1950 dates.
 */
function readabilityScore(item, operatorHit) {
  const vi = item.volumeInfo || {}
  let s = operatorHit ? 2 : 0
  if (vi.imageLinks) s += 3
  const rc = vi.ratingsCount || 0
  s += rc >= 100 ? 3 : rc >= 10 ? 2 : rc > 0 ? 1 : 0
  if (vi.publisher) s += 1
  if (vi.description) s += 1
  const year = parseInt((vi.publishedDate || '').slice(0, 4), 10) || 0
  if (year >= 1950) s += 1
  else if (year > 0 && year < 1900) s -= 2
  if (JUNK_TITLE.test(vi.title || '')) s -= 4
  return s
}

// Session cache: repeat searches (backspacing, re-opening a picker) shouldn't
// re-spend quota — the blended search costs three requests per query.
const searchCache = new Map()
const CACHE_MAX = 60

export async function searchGoogleBooks(query, { signal } = {}) {
  if (!query || query.trim().length < 2) return []
  const q = query.trim()
  const cacheKey = q.toLowerCase()
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)

  // Explicit operator queries (inauthor:, intitle:) pass through untouched.
  if (q.includes(':')) {
    const items = await fetchVolumes(q, { signal })
    return items.map(normalizeBook).filter(Boolean).slice(0, 8)
  }

  // Blend three probes: exact-ish title match, author match, and Google's
  // plain relevance — then rank by the readability score. This is what makes
  // a brand-new novel outrank a century of digitized sermons.
  const [byTitle, byAuthor, plain] = await Promise.all([
    fetchVolumes(`intitle:"${q}"`, { signal }),
    fetchVolumes(`inauthor:"${q}"`, { signal }),
    fetchVolumes(q, { signal }),
  ])

  const seen = new Set()
  const scored = []
  for (const [operatorHit, items] of [[true, byTitle], [true, byAuthor], [false, plain]]) {
    for (const item of items) {
      if (!item?.id || seen.has(item.id)) continue
      seen.add(item.id)
      scored.push({ score: readabilityScore(item, operatorHit), item })
    }
  }
  scored.sort((a, b) => b.score - a.score)
  const results = scored.map((s) => normalizeBook(s.item)).filter(Boolean).slice(0, 8)
  // Only cache useful answers — a rate-limited miss shouldn't stick.
  if (results.length > 0) {
    if (searchCache.size >= CACHE_MAX) searchCache.delete(searchCache.keys().next().value)
    searchCache.set(cacheKey, results)
  }
  return results
}
