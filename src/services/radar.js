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
import { fetchTMDBNewMovies, fetchTMDBNewTV, searchTMDB } from './providers/tmdb'
import { fetchOpenLibraryByAuthors } from './providers/openLibrary'
import { fetchNYTBestsellers } from './providers/nytBooks'
import { searchGoogleBooks } from './providers/googleBooks'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const MAX_PICKS = 14 // unified feed (real-data anchors + releases merged)

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

const RADAR_TYPES = ['music', 'movie', 'tv', 'book']

/**
 * Pick `total` items with a minimum floor per type. Items are assumed to
 * already be sorted best-first globally. We first take `minPerType` from
 * each category (skipping any that don't have enough), then fill the
 * remaining slots from whatever's leftover in the global ranking.
 *
 * This guarantees music/books aren't crowded out by TMDB's popularity-rich
 * movie/TV results.
 */
function pickWithQuotas(items, total, minPerType) {
  const byType = new Map(RADAR_TYPES.map((t) => [t, []]))
  for (const item of items) {
    const bucket = byType.get(item.type)
    if (bucket) bucket.push(item)
  }

  const picked = []
  const pickedIds = new Set()
  const markPicked = (item) => {
    picked.push(item)
    pickedIds.add(item.externalId || item.title)
  }

  // Pass 1: floor per type — only items with a positive taste-match score.
  // If a type's only available items have zero taste relevance, skip the
  // forced floor so random filler doesn't crowd out genuinely relevant items.
  for (const type of RADAR_TYPES) {
    const bucket = (byType.get(type) || []).filter((i) => (i.score ?? 0) > 0)
    for (let i = 0; i < minPerType && i < bucket.length && picked.length < total; i++) {
      markPicked(bucket[i])
    }
  }

  // Pass 2: fill remaining slots from the global ranking.
  for (const item of items) {
    if (picked.length >= total) break
    const id = item.externalId || item.title
    if (pickedIds.has(id)) continue
    markPicked(item)
  }

  return picked
}

// Module-scope dedupe for the spotify-radar function. If multiple callers
// invoke fetchSpotifyNewReleases in quick succession, they all share the
// same in-flight Promise (and therefore the same browser fetch).
let spotifyInflight = null

async function fetchSpotifyNewReleases() {
  if (spotifyInflight) return spotifyInflight

  spotifyInflight = (async () => {
    try {
      const res = await fetch('/.netlify/functions/spotify-radar?limit=20')
      if (!res.ok) return []
      // When running `vite dev` without `netlify dev`, the function route
      // falls through to index.html — guard against HTML masquerading as
      // JSON.
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) return []
      const data = await res.json()
      if (data.error) {
        // Server-side Spotify failure — log with enough detail to diagnose in
        // the browser console without needing Netlify function logs.
        console.warn('spotify-radar returned no music:', data.error, data.status ? `(HTTP ${data.status} from Spotify)` : '')
      }
      return data.items || []
    } catch (err) {
      if (err.name !== 'AbortError') console.error('spotify-radar fetch failed', err)
      return []
    } finally {
      // Hold the cache for 30s so back-to-back renders definitely share
      // the same response, but clear eventually so a manual refresh can
      // force a new fetch.
      setTimeout(() => { spotifyInflight = null }, 30_000)
    }
  })()

  return spotifyInflight
}

/**
 * Honest "tastemaker" anchors built from REAL API data — never an LLM's
 * recollection (which hallucinates fake albums and fake review quotes).
 *
 *  - Book anchor: a current NYT Best Seller. NYT supplies a real review URL
 *    when the book has been reviewed, so the source + link are verifiable.
 *  - Screen anchor: the highest critic-scored recent movie/show from TMDB
 *    (real vote_average over a meaningful vote_count).
 *
 * Each anchor carries an honest `source` label and (for books) a real
 * `reviewUrl`. The letter cites whatever source we hand it, so it can only
 * say true things.
 */
function buildHonestAnchors(booksNYT, movies, tv) {
  const anchors = []

  const bookCands = (booksNYT || []).filter((b) => b && b.title)
  if (bookCands.length) {
    bookCands.sort(
      (a, b) =>
        (b.reviewUrl ? 1 : 0) - (a.reviewUrl ? 1 : 0) ||
        (a.rank || 99) - (b.rank || 99)
    )
    const b = bookCands[0]
    anchors.push({
      ...b,
      isTastemaker: true,
      source: b.reviewUrl ? 'New York Times — reviewed' : 'New York Times Best Sellers',
      blurb: b.description || 'A current New York Times best seller.',
      reviewUrl: b.reviewUrl || '',
    })
  }

  const screenPool = [...(movies || []), ...(tv || [])].filter(
    (s) => s && s.title && (s.voteCount || 0) >= 50 && (s.voteAverage || 0) >= 6.8
  )
  screenPool.sort((a, b) => (b.voteAverage || 0) - (a.voteAverage || 0))
  if (screenPool[0]) {
    const s = screenPool[0]
    anchors.push({
      ...s,
      isTastemaker: true,
      source: `Critics' score ${s.voteAverage.toFixed(1)}/10`,
      blurb: s.description || '',
    })
  }

  return anchors
}

// Some items (e.g. OpenLibrary author matches) arrive without cover art.
// Look them up in the same media APIs the rest of the radar uses so the
// cards show real covers instead of the gradient fallback. Best-effort.
async function spotifyCoverFor(query, signal) {
  try {
    const res = await fetch(
      `/.netlify/functions/spotify-search?q=${encodeURIComponent(query.slice(0, 100))}`,
      { signal }
    )
    if (!res.ok) return ''
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return ''
    const data = await res.json()
    const hit = (data.results || []).find((r) => r.coverUrl)
    return hit?.coverUrl || ''
  } catch {
    return ''
  }
}

async function enrichCoverArt(items, { signal } = {}) {
  return Promise.all(
    items.map(async (item) => {
      if (item.coverUrl) return item
      const q = `${item.title} ${item.creator || ''}`.trim()
      if (!q) return item
      try {
        let coverUrl = ''
        if (item.type === 'music') {
          coverUrl = await spotifyCoverFor(q, signal)
        } else if (item.type === 'movie' || item.type === 'tv') {
          const results = await searchTMDB(item.title, { signal })
          const match =
            results.find((r) => r.type === item.type && r.coverUrl) ||
            results.find((r) => r.coverUrl)
          coverUrl = match?.coverUrl || ''
        } else if (item.type === 'book') {
          const results = await searchGoogleBooks(q, { signal })
          coverUrl = results.find((r) => r.coverUrl)?.coverUrl || ''
        }
        return coverUrl ? { ...item, coverUrl } : item
      } catch {
        return item
      }
    })
  )
}

/**
 * Real-user radar: pulls live releases from Spotify (music), TMDB (movies +
 * TV), OpenLibrary + NYT (books). Real, verifiable "tastemaker" anchors (a
 * NYT-reviewed/best-selling book and the top critic-scored recent screen
 * title) lead the feed. Everything is a real title from a real API — no
 * LLM-recalled picks (those hallucinated fake albums + fake reviews).
 */
async function buildRealRadar(profile, catalogItems, { signal } = {}) {
  const catalogTitles = new Set(
    (catalogItems || []).map((i) => (i.title || '').toLowerCase()).filter(Boolean)
  )
  const favAuthors = profile?.books?.authors || []

  const [music, movies, tv, booksByAuthor, booksNYT] = await Promise.all([
    fetchSpotifyNewReleases({ signal }),
    fetchTMDBNewMovies(12, { signal }),
    fetchTMDBNewTV(12, { signal }),
    fetchOpenLibraryByAuthors(favAuthors, 2, { signal }),
    fetchNYTBestsellers(10, { signal }),
  ])

  const releases = [...music, ...movies, ...tv, ...booksByAuthor, ...booksNYT]
    .map((item) => ({ ...item, score: rankScore(item, profile || {}) }))

  // Real, verifiable anchors (NYT book + top-critic-scored TMDB screen).
  // They get a strong boost so they lead the feed, but they are real titles
  // with honest source labels — no fabrication.
  const anchors = buildHonestAnchors(booksNYT, movies, tv).map((item) => ({
    ...item,
    score: matchScore(item, profile || {}) + 30,
  }))

  const anchorTitles = new Set(anchors.map((a) => (a.title || '').toLowerCase()))
  const merged = [...anchors, ...releases.filter((r) => !anchorTitles.has((r.title || '').toLowerCase()))]
    .sort((a, b) => b.score - a.score)
  const deduped = dedupeByTitle(merged, catalogTitles)
  const ranked = pickWithQuotas(deduped, MAX_PICKS, 2)

  // Backfill cover art for anything still missing it.
  const picks = await enrichCoverArt(ranked, { signal })

  return {
    picks,
    // Keep legacy keys populated for older callers (e.g. Dashboard teaser).
    newReleases: picks,
    discoveries: [],
    generatedAt: new Date().toISOString(),
    isDemo: false,
  }
}

// In-flight request dedupe: if the hook fires multiple times in quick
// succession (React re-renders, nav transitions), we don't want to kick off
// parallel API storms. Concurrent callers share the same Promise.
const inflight = new Map()

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

  const key = `${uid}_${weekKey()}_${opts.forceRefresh ? 'refresh' : 'normal'}`
  if (inflight.has(key)) return inflight.get(key)

  const promise = buildRealRadar(profile, catalogItems, opts)
    .then((fresh) => {
      // Don't cache empty results — a failed API fetch (missing env vars, outage)
      // shouldn't lock the user out for 30 minutes. Leave the cache empty so
      // the next load (or Refresh click) tries the APIs again.
      const hasContent =
        (fresh.newReleases?.length ?? 0) + (fresh.discoveries?.length ?? 0) > 0
      if (hasContent) writeCache(uid, fresh)
      return fresh
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}

/**
 * Synchronous helper for places that only need the demo payload (e.g.
 * Onboarding previews before the user has an account).
 */
export function getDemoRadar(profile, catalogItems = []) {
  const mock = getMockRadar(profile, catalogItems)
  return { ...mock, isDemo: true }
}
