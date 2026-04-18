/**
 * Weekly Radar — demo-aware entrypoint.
 *
 * Demo users (uid starts with "demo") see the hand-crafted parody radar from
 * mockData.js, so onboarding/screenshots stay coherent.
 *
 * Real signed-in users get live data pulled from Spotify, TMDB, and
 * OpenLibrary. Results are keyed by user + week and cached for 30 min to
 * avoid pounding the APIs on every page view.
 */

import { getWeeklyRadar as getMockRadar } from './mockData'
import { matchScore } from '../utils/matchScore'
import { fetchTMDBNewMovies, fetchTMDBNewTV } from './providers/tmdb'
import {
  fetchOpenLibraryNewReleases,
  fetchOpenLibraryByAuthors,
} from './providers/openLibrary'
import { fetchNYTBestsellers } from './providers/nytBooks'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const MAX_RELEASES = 8
const MAX_DISCOVERIES = 6

function isDemoUid(uid) {
  return typeof uid === 'string' && uid.startsWith('demo')
}

function weekKey() {
  const d = new Date()
  const year = d.getFullYear()
  const onejan = new Date(year, 0, 1)
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7)
  return `${year}-W${week}`
}

function cacheKey(uid) {
  return `cc_radar_${uid}_${weekKey()}`
}

function readCache(uid) {
  try {
    const raw = localStorage.getItem(cacheKey(uid))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.generatedAt) return null
    const age = Date.now() - new Date(parsed.generatedAt).getTime()
    if (age > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(uid, payload) {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(payload))
  } catch {
    // Quota or private-browsing mode — silently skip cache.
  }
}

function dedupeByTitle(items, existingTitles = new Set()) {
  const seen = new Set(Array.from(existingTitles).map((t) => t.toLowerCase()))
  const out = []
  for (const item of items) {
    const key = (item.title || '').toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

async function fetchSpotifyNewReleases({ signal } = {}) {
  try {
    const res = await fetch('/.netlify/functions/spotify-radar?limit=20', { signal })
    if (!res.ok) return []
    // When running `vite dev` without `netlify dev`, the function route falls
    // through to index.html — guard against HTML masquerading as JSON.
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return []
    const data = await res.json()
    return data.items || []
  } catch (err) {
    if (err.name !== 'AbortError') console.error('spotify-radar fetch failed', err)
    return []
  }
}

/**
 * Real-user radar: pulls from Spotify (music), TMDB (movies + TV), OpenLibrary
 * (books). All requests run in parallel; any individual failure returns [].
 */
async function buildRealRadar(profile, catalogItems, { signal } = {}) {
  const catalogTitles = new Set(
    (catalogItems || []).map((i) => (i.title || '').toLowerCase()).filter(Boolean)
  )
  const favAuthors = profile?.books?.authors || []

  const [music, movies, tv, booksNew, booksByAuthor, booksNYT] = await Promise.all([
    fetchSpotifyNewReleases({ signal }),
    fetchTMDBNewMovies(12, { signal }),
    fetchTMDBNewTV(12, { signal }),
    fetchOpenLibraryNewReleases(10, { signal }),
    fetchOpenLibraryByAuthors(favAuthors, 2, { signal }),
    fetchNYTBestsellers(10, { signal }),
  ])

  const allReleases = [...music, ...movies, ...tv, ...booksNew, ...booksByAuthor, ...booksNYT]
    .map((item) => ({ ...item, score: matchScore(item, profile || {}) }))
    .sort((a, b) => b.score - a.score)

  const deduped = dedupeByTitle(allReleases, catalogTitles)

  const newReleases = deduped.slice(0, MAX_RELEASES)
  const takenIds = new Set(newReleases.map((r) => r.externalId || r.title))
  const discoveries = deduped
    .filter((r) => !takenIds.has(r.externalId || r.title))
    .slice(0, MAX_DISCOVERIES)
    .map((item) => ({ ...item, isDiscovery: true, isNewRelease: false }))

  return {
    newReleases,
    discoveries,
    generatedAt: new Date().toISOString(),
    isDemo: false,
  }
}

/**
 * Public entrypoint. Returns the same shape `mockData.getWeeklyRadar` used to
 * return, plus an `isDemo` flag so the UI can show the parody caveat.
 */
export async function getWeeklyRadar(user, profile, catalogItems = [], opts = {}) {
  const uid = user?.uid || 'anonymous'

  if (!user || isDemoUid(uid)) {
    const mock = getMockRadar(profile, catalogItems)
    return { ...mock, isDemo: true }
  }

  if (!opts.forceRefresh) {
    const cached = readCache(uid)
    if (cached) return cached
  }

  const fresh = await buildRealRadar(profile, catalogItems, opts)
  writeCache(uid, fresh)
  return fresh
}

/**
 * Synchronous helper for places that only need the demo payload (e.g.
 * Onboarding previews before the user has an account).
 */
export function getDemoRadar(profile, catalogItems = []) {
  const mock = getMockRadar(profile, catalogItems)
  return { ...mock, isDemo: true }
}
