/**
 * OpenLibrary provider for radar recommendations.
 * No API key required. Docs: https://openlibrary.org/dev/docs/api/search
 *
 * Exposes two helpers tuned for radar use:
 *   - fetchOpenLibraryNewReleases(limit) — newest-published books of the year
 *   - fetchOpenLibraryByAuthors(authors, limit) — top works by favorite authors
 */

const BASE = 'https://openlibrary.org'
const COVER_BASE = 'https://covers.openlibrary.org/b/id'

function coverUrl(doc) {
  // cover_i (integer ID) is the most reliable source; fall back to the first
  // ISBN if it's missing — covers.openlibrary.org supports both lookup keys.
  if (doc.cover_i) return `${COVER_BASE}/${doc.cover_i}-M.jpg`
  const isbn = Array.isArray(doc.isbn) ? doc.isbn[0] : doc.isbn
  if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
  return ''
}

function normalizeDoc(doc) {
  if (!doc) return null
  const title = doc.title || ''
  if (!title) return null
  const authors = doc.author_name || []
  const year = doc.first_publish_year || doc.publish_year?.[0] || ''
  return {
    type: 'book',
    provider: 'openlibrary',
    externalId: doc.key || `${title}-${authors[0] || ''}`,
    title,
    creator: authors.join(', '),
    genre: (doc.subject || [])[0] || '',
    releaseDate: year ? String(year) : '',
    coverUrl: coverUrl(doc),
    description: '',
    isNewRelease: true,
  }
}

async function searchOpenLibrary(params, { signal } = {}) {
  const qs = new URLSearchParams(params).toString()
  const url = `${BASE}/search.json?${qs}`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = await res.json()
    return (data.docs || []).map(normalizeDoc).filter(Boolean)
  } catch (err) {
    if (err.name !== 'AbortError') console.error('OpenLibrary search failed', err)
    return []
  }
}

/**
 * Pull the newest-published books. OpenLibrary sorts by `new` (recency of
 * first publish). We constrain to the current year so the list stays fresh.
 */
export async function fetchOpenLibraryNewReleases(limit = 10, { signal } = {}) {
  const year = new Date().getFullYear()
  const items = await searchOpenLibrary(
    {
      q: `first_publish_year:${year}`,
      sort: 'new',
      limit: String(limit),
      fields: 'key,title,author_name,first_publish_year,cover_i,isbn,subject',
    },
    { signal }
  )
  return items
}

/**
 * Fetch recent/top books for a list of favorite authors. One request per
 * author, capped at `perAuthor` results each, executed in parallel.
 */
export async function fetchOpenLibraryByAuthors(authors = [], perAuthor = 2, { signal } = {}) {
  const cleanAuthors = authors.filter(Boolean).slice(0, 6)
  if (cleanAuthors.length === 0) return []

  const results = await Promise.all(
    cleanAuthors.map((author) =>
      searchOpenLibrary(
        {
          author: author,
          sort: 'new',
          limit: String(perAuthor),
          fields: 'key,title,author_name,first_publish_year,cover_i,isbn,subject',
        },
        { signal }
      )
    )
  )

  return results.flat()
}
