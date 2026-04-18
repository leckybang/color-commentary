/**
 * NYT Books API — weekly bestseller lists.
 * Docs: https://developer.nytimes.com/docs/books-product/1/overview
 * Key is client-safe (same posture as TMDB). Rate limit: 500/day, 5/min.
 */

const API_KEY = import.meta.env.VITE_NYT_BOOKS_API_KEY
const BASE = 'https://api.nytimes.com/svc/books/v3'

export const isNYTConfigured = !!API_KEY

function normalize(book) {
  if (!book) return null
  return {
    type: 'book',
    provider: 'nyt',
    externalId: book.primary_isbn13 || book.primary_isbn10 || `${book.title}-${book.author}`,
    title: book.title || '',
    creator: book.author || '',
    genre: '',
    releaseDate: '', // NYT bestseller entries don't carry a clean publish date
    coverUrl: book.book_image || '',
    description: book.description || '',
    isNewRelease: true,
  }
}

/**
 * Weekly overview — returns the top few books from each NYT list (fiction,
 * nonfiction, hardcover, etc.). One API call, ~15 lists × 5 books each.
 */
export async function fetchNYTBestsellers(limit = 10, { signal } = {}) {
  if (!API_KEY) return []
  const url = `${BASE}/lists/overview.json?api-key=${API_KEY}`

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) {
      if (res.status === 429) console.warn('NYT Books API rate-limited')
      return []
    }
    const data = await res.json()
    const lists = data.results?.lists || []

    // Take the top 2 books from each list, interleaved, so we get variety
    // across fiction/nonfiction/hardcover rather than all one genre.
    const picks = []
    const perList = 2
    for (let i = 0; i < perList; i++) {
      for (const list of lists) {
        const book = list.books?.[i]
        if (book) picks.push(normalize(book))
      }
    }

    // Dedupe by ISBN (same book can appear on multiple lists).
    const seen = new Set()
    const deduped = []
    for (const p of picks) {
      if (!p || seen.has(p.externalId)) continue
      seen.add(p.externalId)
      deduped.push(p)
    }

    return deduped.slice(0, limit)
  } catch (err) {
    if (err.name !== 'AbortError') console.error('NYT Books fetch failed', err)
    return []
  }
}
