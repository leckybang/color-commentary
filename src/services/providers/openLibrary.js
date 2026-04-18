/**
 * OpenLibrary provider — used for book "new releases" and genre-based discoveries.
 * Free, no key required. Docs: https://openlibrary.org/dev/docs/api/search
 *
 * Google Books remains the primary search provider (better title lookup); OpenLibrary
 * is used here because it exposes a `sort=new` order that Google Books doesn't.
 */

const BASE = 'https://openlibrary.org'
const COVER_BASE = 'https://covers.openlibrary.org/b/id'

function coverUrl(coverId) {
  return coverId ? `${COVER_BASE}/${coverId}-M.jpg` : ''
}

function normalizeDoc(doc, extra = {}) {
  if (!doc?.title) return null
  const author = (doc.author_name || [])[0] || ''
  const year = doc.first_publish_year || (doc.publish_year || [])[0] || ''
  const subject = (doc.subject || [])[0] || ''
  return {
    title: doc.title,
    creator: author,
    type: 'book',
    genre: subject,
    releaseDate: year ? String(year) : '',
    description: '',
    coverUrl: coverUrl(doc.cover_i),
    provider: 'openlibrary',
    externalId: doc.key || '',
    ...extra,
  }
}

/**
 * New book releases. OpenLibrary doesn't have a true "new releases" endpoint, but
 * we can search by recent publish year, sorted by newest — closest available proxy.
 * If the taste profile has favorite authors, prefer their recent work.
 */
export async function fetchOpenLibraryNewReleases(tasteProfile = {}, { signal } = {}) {
  const authors = tasteProfile.books?.authors || []
  const thisYear = new Date().getFullYear()
  const recentYears = `[${thisYear - 1} TO ${thisYear + 1}]`

  try {
    // 1) Recent work by user's favorite authors (if any)
    const authorQueries = authors.slice(0, 3).map((a) =>
      fetch(
        `${BASE}/search.json?author=${encodeURIComponent(a)}&sort=new&limit=5`,
        { signal }
      ).then((r) => (r.ok ? r.json() : { docs: [] }))
    )

    // 2) Generally new books (fallback + backfill)
    const generalQuery = fetch(
      `${BASE}/search.json?q=first_publish_year%3A${recentYears}&sort=new&limit=10&has_fulltext=true`,
      { signal }
    ).then((r) => (r.ok ? r.json() : { docs: [] }))

    const [general, ...authorResults] = await Promise.all([generalQuery, ...authorQueries])

    const seen = new Set()
    const items = []

    // Prioritize author matches
    for (let i = 0; i < authorResults.length; i++) {
      const author = authors[i]
      for (const doc of authorResults[i].docs || []) {
        const norm = normalizeDoc(doc)
        if (!norm || seen.has(norm.title.toLowerCase())) continue
        // Only include recent books
        const year = Number(norm.releaseDate)
        if (!year || year < thisYear - 2) continue
        seen.add(norm.title.toLowerCase())
        items.push({ ...norm, creatorNote: `New from ${author}` })
      }
    }

    // Backfill with general new releases
    for (const doc of general.docs || []) {
      const norm = normalizeDoc(doc)
      if (!norm || seen.has(norm.title.toLowerCase())) continue
      seen.add(norm.title.toLowerCase())
      items.push(norm)
    }

    return items.slice(0, 12)
  } catch (err) {
    if (err.name !== 'AbortError') console.error('OpenLibrary new releases failed', err)
    return []
  }
}

/**
 * Discovery picks: books in user's favorite genres/subjects, popular rather than new.
 */
export async function fetchOpenLibraryDiscoveries(tasteProfile = {}, { signal } = {}) {
  const genres = tasteProfile.books?.genres || []
  if (genres.length === 0) return []

  try {
    const queries = genres.slice(0, 3).map((g) =>
      fetch(
        `${BASE}/search.json?subject=${encodeURIComponent(g)}&sort=rating&limit=5`,
        { signal }
      ).then((r) => (r.ok ? r.json() : { docs: [] }))
    )
    const results = await Promise.all(queries)
    const seen = new Set()
    const items = []
    results.forEach((res, i) => {
      const genre = genres[i]
      for (const doc of res.docs || []) {
        const norm = normalizeDoc(doc, { reason: `Acclaimed in ${genre}` })
        if (!norm || seen.has(norm.title.toLowerCase())) continue
        seen.add(norm.title.toLowerCase())
        items.push(norm)
      }
    })
    return items
  } catch (err) {
    if (err.name !== 'AbortError') console.error('OpenLibrary discoveries failed', err)
    return []
  }
}
