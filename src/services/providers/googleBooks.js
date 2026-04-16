/**
 * Google Books search provider
 * Docs: https://developers.google.com/books/docs/v1/using
 * No API key needed for basic search (1000 req/day limit).
 */

const BASE = 'https://www.googleapis.com/books/v1'

function normalizeBook(item) {
  if (!item || !item.volumeInfo) return null
  const vi = item.volumeInfo
  const cover = vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail || ''
  return {
    kind: 'media',
    provider: 'googlebooks',
    externalId: item.id,
    type: 'book',
    title: vi.title || '',
    creator: (vi.authors || []).join(', '),
    year: (vi.publishedDate || '').slice(0, 4),
    coverUrl: cover ? cover.replace(/^http:\/\//, 'https://') : '',
    overview: vi.description || '',
  }
}

export async function searchGoogleBooks(query, { signal } = {}) {
  if (!query || query.trim().length < 2) return []

  const url = `${BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=8&printType=books`

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = await res.json()
    return (data.items || []).map(normalizeBook).filter(Boolean)
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Google Books search failed', err)
    return []
  }
}
