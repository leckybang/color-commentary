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

  const keyParam = API_KEY ? `&key=${API_KEY}` : ''
  const url = `${BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=8&printType=books${keyParam}`

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('Google Books rate-limited. Add VITE_GOOGLE_BOOKS_API_KEY to your env vars.')
      }
      return []
    }
    const data = await res.json()
    return (data.items || []).map(normalizeBook).filter(Boolean)
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Google Books search failed', err)
    return []
  }
}
