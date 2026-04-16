/**
 * Unified media search orchestrator.
 * Routes queries to TMDB, Google Books, and/or Spotify based on preferredTypes.
 * Includes a simple in-memory LRU cache to reduce API calls.
 */

import { searchTMDB } from './providers/tmdb'
import { searchGoogleBooks } from './providers/googleBooks'
import { searchSpotify } from './providers/spotify'

const CACHE_SIZE = 50
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const cache = new Map() // key -> { results, expiresAt }

function cacheKey(query, types) {
  return `${query.toLowerCase().trim()}::${types.sort().join(',')}`
}

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }
  // Bump to most-recently-used
  cache.delete(key)
  cache.set(key, entry)
  return entry.results
}

function setCached(key, results) {
  if (cache.size >= CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
  cache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS })
}

// Naive fuzzy relevance score — count of query tokens appearing in title/creator
function relevance(result, query) {
  const q = query.toLowerCase().trim()
  const haystack = `${result.title} ${result.creator || ''}`.toLowerCase()
  if (haystack.includes(q)) return 10
  const tokens = q.split(/\s+/).filter(t => t.length >= 2)
  let score = 0
  for (const t of tokens) if (haystack.includes(t)) score += 1
  return score
}

/**
 * @param {string} query
 * @param {string[]} preferredTypes — array of 'music' | 'movie' | 'tv' | 'book'
 * @param {object} opts — { signal?: AbortSignal }
 */
export async function searchMedia(query, preferredTypes, opts = {}) {
  if (!query || query.trim().length < 2) return []

  const types = preferredTypes && preferredTypes.length > 0
    ? preferredTypes
    : ['music', 'movie', 'tv', 'book']

  const key = cacheKey(query, types)
  const cached = getCached(key)
  if (cached) return cached

  const wantsVideo = types.includes('movie') || types.includes('tv')
  const wantsBook = types.includes('book')
  const wantsMusic = types.includes('music')

  const promises = []
  if (wantsVideo) promises.push(searchTMDB(query, opts))
  if (wantsBook) promises.push(searchGoogleBooks(query, opts))
  if (wantsMusic) promises.push(searchSpotify(query, opts))

  const settled = await Promise.allSettled(promises)
  let results = settled.flatMap(r => (r.status === 'fulfilled' ? r.value : []))

  // Filter to types actually requested (TMDB returns both movie + tv; we might only want one)
  results = results.filter(r => types.includes(r.type))

  // Sort by relevance, then cap
  results.sort((a, b) => relevance(b, query) - relevance(a, query))
  const capped = results.slice(0, 12)

  setCached(key, capped)
  return capped
}
