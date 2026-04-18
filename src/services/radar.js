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
import { fetchOpenLibraryByAuthors } from './providers/openLibrary'
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

/**
 * Recency score — items released this month get the biggest boost, trailing
 * off over ~6 months. Items without a release date get a small penalty so
 * they fall below anything with real recency data. The intent: "buzzy this
 * week" should beat "old show that still airs."
 */
function recencyScore(releaseDate) {
  if (!releaseDate) return -2
  const ts = Date.parse(releaseDate)
  if (Number.isNaN(ts)) return -2
  const daysFromNow = Math.abs(Date.now() - ts) / 86400000
  if (daysFromNow <= 14) return 20 // last two weeks — strongest boost
  if (daysFromNow <= 45) return 12
  if (daysFromNow <= 90) return 6
  if (daysFromNow <= 180) return 2
  return -5 // older than 6 months: actively demoted
}

/**
 * Popularity bonus for items that carry a TMDB popularity score. Normalized
 * so even the most popular items add at most ~4 points — enough to break
 * ties within a recency tier without drowning out taste matches.
 */
function popularityScore(item) {
  const p = item.popularity
  if (!p || p <= 0) return 0
  return Math.min(4, Math.log10(p + 1) * 2)
}

function rankScore(item, profile) {
  return matchScore(item, profile) + recencyScore(item.releaseDate) + popularityScore(item)
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

  // Book sources: NYT bestsellers for curated picks + OpenLibrary scoped to
  // favorite authors. We intentionally skip OpenLibrary's generic "new
  // releases" stream because it's flooded with low-quality self-published
  // entries with placeholder dates.
  const [music, movies, tv, booksByAuthor, booksNYT] = await Promise.all([
    fetchSpotifyNewReleases({ signal }),
    fetchTMDBNewMovies(12, { signal }),
    fetchTMDBNewTV(12, { signal }),
    fetchOpenLibraryByAuthors(favAuthors, 2, { signal }),
    fetchNYTBestsellers(10, { signal }),
  ])

  const allReleases = [...music, ...movies, ...tv, ...booksByAuthor, ...booksNYT]
    .map((item) => ({ ...item, score: rankScore(item, profile || {}) }))
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
