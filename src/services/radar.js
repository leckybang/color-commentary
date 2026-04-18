/**
 * Unified Weekly Radar service.
 *
 * Demo users get the hand-crafted mock radar from mockData.js (affectionate parody).
 * Real users get live data from Spotify, TMDB, and OpenLibrary — ranked against
 * their taste profile via the shared matchScore.
 */

import { getWeeklyRadar as getMockRadar } from './mockData'
import { matchScore, topCreators, topGenres } from '../utils/matchScore'
import { fetchSpotifyNewReleases, fetchSpotifyRecommendations } from './providers/spotify'
import { fetchTMDBNewReleases, fetchTMDBDiscoveries } from './providers/tmdb'
import { fetchOpenLibraryNewReleases, fetchOpenLibraryDiscoveries } from './providers/openLibrary'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const cache = new Map() // key -> { data, expires }

function cacheKey(user, profile) {
  const profileHash = JSON.stringify({
    music: profile?.music,
    movies: profile?.movies,
    tv: profile?.tv,
    books: profile?.books,
  })
  return `${user?.uid || 'anon'}::${profileHash}`
}

function isDemoUser(user) {
  return !!user?.uid?.startsWith('demo')
}

function dedupeByTitle(items) {
  const seen = new Set()
  const out = []
  for (const item of items) {
    const key = `${item.type}::${(item.title || '').toLowerCase()}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function filterCatalog(items, catalogItems) {
  const seen = new Set(catalogItems.map((i) => `${i.type}::${(i.title || '').toLowerCase()}`))
  return items.filter((i) => !seen.has(`${i.type}::${(i.title || '').toLowerCase()}`))
}

function rank(items, profile, tag) {
  return items
    .map((i) => ({ ...i, score: matchScore(i, profile), [tag]: true }))
    .sort((a, b) => b.score - a.score)
}

async function buildRealRadar(profile, catalogItems, { signal } = {}) {
  const seedArtists = topCreators(profile, 3)
  const genres = topGenres(profile, 5)

  const [spotifyNew, tmdbNew, bookNew, spotifyRecs, tmdbDisc, bookDisc] = await Promise.all([
    fetchSpotifyNewReleases({ signal }),
    fetchTMDBNewReleases({ signal }),
    fetchOpenLibraryNewReleases(profile, { signal }),
    fetchSpotifyRecommendations(seedArtists, { signal }),
    fetchTMDBDiscoveries(genres, { signal }),
    fetchOpenLibraryDiscoveries(profile, { signal }),
  ])

  const releasesRaw = dedupeByTitle([...spotifyNew, ...tmdbNew, ...bookNew])
  const discoveriesRaw = dedupeByTitle([...spotifyRecs, ...tmdbDisc, ...bookDisc])

  const releases = filterCatalog(releasesRaw, catalogItems)
  const discoveries = filterCatalog(discoveriesRaw, catalogItems)

  const newReleases = rank(releases, profile, 'isNewRelease').slice(0, 8)

  // Keep discoveries disjoint from new releases to avoid duplication between tabs.
  const releaseKeys = new Set(newReleases.map((i) => `${i.type}::${i.title.toLowerCase()}`))
  const disjointDiscoveries = discoveries.filter(
    (i) => !releaseKeys.has(`${i.type}::${(i.title || '').toLowerCase()}`)
  )
  const discoveryResults = rank(disjointDiscoveries, profile, 'isDiscovery').slice(0, 6)

  return {
    newReleases,
    discoveries: discoveryResults,
    generatedAt: new Date().toISOString(),
    source: 'live',
  }
}

/**
 * Main entrypoint. Returns a Promise resolving to { newReleases, discoveries, generatedAt, source }.
 * `source` is 'demo' for demo users, 'live' for real users.
 */
export async function getWeeklyRadar(user, profile, catalogItems = [], opts = {}) {
  if (isDemoUser(user)) {
    return { ...getMockRadar(profile, catalogItems), source: 'demo' }
  }

  const key = cacheKey(user, profile)
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now() && !opts.force) {
    // Re-filter catalog (may have changed since cache) and re-rank with fresh jitter
    const newReleases = rank(filterCatalog(cached.data.newReleasesRaw, catalogItems), profile, 'isNewRelease').slice(0, 8)
    const releaseKeys = new Set(newReleases.map((i) => `${i.type}::${i.title.toLowerCase()}`))
    const disjoint = cached.data.discoveriesRaw.filter(
      (i) => !releaseKeys.has(`${i.type}::${(i.title || '').toLowerCase()}`)
    )
    const discoveries = rank(filterCatalog(disjoint, catalogItems), profile, 'isDiscovery').slice(0, 6)
    return { newReleases, discoveries, generatedAt: cached.data.generatedAt, source: 'live' }
  }

  const radar = await buildRealRadar(profile, catalogItems, opts)
  cache.set(key, {
    data: {
      // Store unfiltered/unranked so we can re-filter on cache hits
      newReleasesRaw: radar.newReleases,
      discoveriesRaw: radar.discoveries,
      generatedAt: radar.generatedAt,
    },
    expires: Date.now() + CACHE_TTL_MS,
  })
  return radar
}

export function clearRadarCache() {
  cache.clear()
}
