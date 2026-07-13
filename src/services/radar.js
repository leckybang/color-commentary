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
import { fetchTMDBNewMovies, fetchTMDBNewTV, searchTMDB, fetchTMDBCredits } from './providers/tmdb'
import { fetchNYTBestsellers } from './providers/nytBooks'
import { searchGoogleBooks } from './providers/googleBooks'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

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
  // v3: edition-duplicate fix — v2 caches can hold the same book twice.
  return `cc_radar_v3_${uid}_${weekKey()}`
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

// Module-scope dedupe for the spotify-radar function. If multiple callers
// invoke fetchSpotifyNewReleases in quick succession, they all share the
// same in-flight Promise (and therefore the same browser fetch).
let spotifyInflight = null

async function fetchSpotifyNewReleases() {
  if (spotifyInflight) return spotifyInflight

  spotifyInflight = (async () => {
    try {
      // Spotify caps tag:new search pages at 10 for this app tier; asking for
      // more gets the whole request rejected with a 400.
      const res = await fetch('/.netlify/functions/spotify-radar?limit=10')
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

// Some items (e.g. Pitchfork RSS items) arrive without cover art.
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

async function fetchPitchforkBNM({ signal } = {}) {
  try {
    const res = await fetch('/.netlify/functions/pitchfork-rss', { signal })
    if (!res.ok) return []
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return []
    const data = await res.json()
    return Array.isArray(data.items) ? data.items : []
  } catch (err) {
    if (err.name !== 'AbortError') console.warn('pitchfork-rss fetch failed', err.message)
    return []
  }
}

/**
 * Real-user radar — two generic buckets:
 *
 *   HYPED: popular + well-reviewed new things (top critic-scored TMDB by
 *     popularity, top NYT bestsellers, fresh Pitchfork BNM albums for music,
 *     plus a couple of fresh Spotify drops when available).
 *   CRITICS' DARLINGS: NYT-reviewed books, the top critic-scored TMDB
 *     titles, more Pitchfork "Best New Music". Things the press loves.
 *
 * All real data from APIs we already use — no LLM recall, no hallucinated
 * picks. No personalization either; same dispatch for everyone.
 *
 * Music backbone is Pitchfork BNM (always real, has reviewUrl). Spotify
 * new releases are sprinkled in when reachable but never required — if
 * the Spotify creds aren't set, the bucket still has music.
 */
async function buildRealRadar({ signal } = {}) {
  const [music, movies, tv, booksNYT, pitchfork] = await Promise.all([
    fetchSpotifyNewReleases({ signal }),
    fetchTMDBNewMovies(20, { signal }),
    fetchTMDBNewTV(20, { signal }),
    fetchNYTBestsellers(15, { signal }),
    fetchPitchforkBNM({ signal }),
  ])

  const tag = (items, bucket, extras = {}) =>
    items.map((it) => ({ ...it, bucket, isTastemaker: true, ...extras(it) }))

  const daysOld = (d) => (d ? (Date.now() - new Date(d).getTime()) / 86400000 : Infinity)
  // Key on type+title (not externalId): the same work can carry different
  // provider ids across editions, and a duplicate title IS the bug.
  const itemKey = (it) => `${it.type}:${(it.title || '').toLowerCase().trim()}`

  // ── NEW & TRENDING — strictly current, built first so the other buckets
  // can exclude anything shown here. This is the antidote to list warhorses
  // (a book can sit on the NYT list for a year; it isn't *new*).
  const freshBooks = booksNYT
    .filter((b) => (b.weeksOnList ?? 99) <= 4)
    .sort((a, b) => (a.rank || 99) - (b.rank || 99))
    .slice(0, 3)
  const freshMovies = [...movies]
    .filter((m) => daysOld(m.releaseDate) <= 21 && (m.voteCount || 0) >= 10)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 2)
  const freshTV = [...tv]
    .filter((t) => daysOld(t.releaseDate) <= 30 && (t.voteCount || 0) >= 5)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 2)
  const freshPitchfork = pitchfork
    .filter((p) => daysOld(p.releaseDate) <= 14)
    .slice(0, 2)
    .map((p) => ({ ...p, bucket: 'fresh', isTastemaker: true }))
  // Spotify tag:new is inherently ≤ ~2 weeks old — it lives here now.
  const freshSpotify = tag((music || []).slice(0, 2), 'fresh', () => ({ source: 'New on Spotify', blurb: '' }))

  const fresh = [
    ...tag(freshBooks, 'fresh', (b) => ({
      source: (b.weeksOnList ?? 99) <= 1 ? 'Debuted on the NYT list this week' : `New to the NYT list${b.rank ? ` · #${b.rank}` : ''}`,
      blurb: b.description || '',
    })),
    ...tag(freshMovies, 'fresh', (m) => ({ source: 'Just released · trending', blurb: m.description || '' })),
    ...tag(freshTV, 'fresh', (t) => ({ source: 'Just premiered · trending', blurb: t.description || '' })),
    ...freshPitchfork,
    ...freshSpotify,
  ]
  const freshKeys = new Set(fresh.map(itemKey))

  // ── HYPED ── (long-running list warhorses capped at ~3 months so the same
  // titles don't park here forever)
  const hypedMovies = [...movies]
    .filter((m) => (m.voteAverage || 0) >= 7 && (m.voteCount || 0) >= 100)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 3)
  const hypedTV = [...tv]
    .filter((t) => (t.voteAverage || 0) >= 7 && (t.voteCount || 0) >= 50)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 3)
  const hypedBooks = booksNYT
    .filter((b) => (b.rank || 99) <= 5 && (b.weeksOnList ?? 99) <= 8)
    .sort((a, b) => (a.weeksOnList ?? 99) - (b.weeksOnList ?? 99))
    .slice(0, 3)

  // Music: Pitchfork is the reliable backbone (real titles + real review
  // URLs). Each pick keeps its own honest source/review tag.
  const hypedPitchfork = pitchfork.slice(0, 2).map((p) => ({ ...p, bucket: 'hyped', isTastemaker: true }))

  const hyped = [
    ...tag(hypedBooks, 'hyped', (b) => ({ source: `NYT Best Seller${b.rank ? ` · #${b.rank}` : ''}`, blurb: b.description || 'A current New York Times best seller.' })),
    ...tag(hypedMovies, 'hyped', (m) => ({ source: `Critics ${m.voteAverage.toFixed(1)}/10 · trending`, blurb: m.description || '' })),
    ...tag(hypedTV, 'hyped', (t) => ({ source: `Critics ${t.voteAverage.toFixed(1)}/10 · trending`, blurb: t.description || '' })),
    ...hypedPitchfork,
  ].filter((it) => !freshKeys.has(itemKey(it)))

  // ── CRITICS' DARLINGS ──
  const reviewedBooks = booksNYT.filter((b) => b.reviewUrl).slice(0, 3)
  const acclaimedMovies = [...movies]
    .filter((m) => (m.voteAverage || 0) >= 7.6 && (m.voteCount || 0) >= 200)
    .sort((a, b) => (b.voteAverage || 0) - (a.voteAverage || 0))
    .slice(0, 2)
  const acclaimedTV = [...tv]
    .filter((t) => (t.voteAverage || 0) >= 7.6 && (t.voteCount || 0) >= 100)
    .sort((a, b) => (b.voteAverage || 0) - (a.voteAverage || 0))
    .slice(0, 2)
  // Pitchfork BNM picks not already in hyped go to darlings.
  const usedPitchforkIds = new Set(hypedPitchfork.map((p) => p.externalId))
  const darlingsPitchfork = pitchfork
    .filter((p) => !usedPitchforkIds.has(p.externalId))
    .slice(0, 3)
    .map((p) => ({ ...p, bucket: 'darlings', isTastemaker: true }))
  const darlings = [
    ...tag(reviewedBooks, 'darlings', () => ({ source: 'New York Times · reviewed', blurb: '' })),
    ...darlingsPitchfork,
    ...tag(acclaimedMovies, 'darlings', (m) => ({ source: `Critics' score ${m.voteAverage.toFixed(1)}/10`, blurb: m.description || '' })),
    ...tag(acclaimedTV, 'darlings', (t) => ({ source: `Critics' score ${t.voteAverage.toFixed(1)}/10`, blurb: t.description || '' })),
  ].filter((it) => !freshKeys.has(itemKey(it)))

  // Backfill cover art for anything missing it (e.g. Pitchfork RSS items).
  let [freshFinal, hypedFinal, darlingsFinal] = await Promise.all([
    enrichCoverArt(fresh, { signal }),
    enrichCoverArt(hyped, { signal }),
    enrichCoverArt(darlings, { signal }),
  ])

  // Enrich TMDB items (movies / TV) with director + lead cast. Cheap parallel
  // calls; missing credits just leave creator/cast empty.
  ;[freshFinal, hypedFinal, darlingsFinal] = await Promise.all([
    enrichTMDBCredits(freshFinal, { signal }),
    enrichTMDBCredits(hypedFinal, { signal }),
    enrichTMDBCredits(darlingsFinal, { signal }),
  ])

  return {
    fresh: freshFinal,
    hyped: hypedFinal,
    darlings: darlingsFinal,
    generatedAt: new Date().toISOString(),
    isDemo: false,
  }
}

async function enrichTMDBCredits(items, { signal } = {}) {
  return Promise.all(
    items.map(async (item) => {
      if (item.provider !== 'tmdb' || !item.externalId) return item
      const { creator, cast } = await fetchTMDBCredits(item.externalId, item.type, { signal })
      return {
        ...item,
        creator: item.creator || creator,
        cast: cast || [],
      }
    })
  )
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

  const promise = buildRealRadar(opts)
    .then((fresh) => {
      // Don't cache empty results — a failed API fetch (missing env vars, outage)
      // shouldn't lock the user out for 30 minutes.
      const hasContent =
        (fresh.hyped?.length ?? 0) + (fresh.darlings?.length ?? 0) > 0
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
export function getDemoRadar(profile = {}, catalogItems = []) {
  const mock = getMockRadar(profile, catalogItems)
  return { ...mock, isDemo: true }
}
