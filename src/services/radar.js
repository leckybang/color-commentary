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
import {
  fetchTMDBNewMovies,
  fetchTMDBNewTV,
  fetchTMDBUpcomingMovies,
  fetchTMDBUpcomingTV,
  searchTMDB,
  fetchTMDBCredits,
} from './providers/tmdb'
import { fetchNYTBestsellers } from './providers/nytBooks'
import { searchGoogleBooks } from './providers/googleBooks'
import { readCachedDismissed, pickKey } from './dismissedPicks'

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
  // v4: rotation + Coming Soon / Accolades buckets. Older caches have neither.
  return `cc_radar_v4_${uid}_${weekKey()}`
}

// ─────────────────────────────────────────────────────────────────────────
// Rotation
//
// The radar used to take the top N off each sorted source list, which meant
// a title that ranked highly stayed on the radar until it fell off the source
// — for a NYT list book, potentially months. Two things fix that: a pool
// deeper than the slice we show, and a memory of what was already shown.
// ─────────────────────────────────────────────────────────────────────────

/** How many past weeks of picks to actively avoid repeating. */
const REPEAT_MEMORY_WEEKS = 3

function seenKey(uid) {
  return `cc_radar_seen_v1_${uid}`
}

/** { itemKey: weekKey } for everything shown recently. */
function readSeen(uid) {
  try {
    const raw = localStorage.getItem(seenKey(uid))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeSeen(uid, seen) {
  try {
    localStorage.setItem(seenKey(uid), JSON.stringify(seen))
  } catch {
    // Quota or private browsing — rotation degrades to "no memory", which is
    // exactly the old behaviour. Not worth failing the radar over.
  }
}

/** Week keys for the last N weeks, today included. */
function recentWeekKeys(n) {
  const out = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    const year = d.getFullYear()
    const onejan = new Date(year, 0, 1)
    const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7)
    out.push(`${year}-W${week}`)
  }
  return out
}

/** Small deterministic string hash — the seed for this week's shuffle. */
function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Fisher-Yates with a seeded generator. Seeded rather than random so the radar
 * is stable within a week (refresh doesn't reshuffle under you) but different
 * between weeks.
 */
function seededShuffle(items, seed) {
  const out = [...items]
  let state = seed || 1
  const next = () => {
    // xorshift32
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Pick `count` items from a pool, preferring ones not shown in PREVIOUS weeks.
 *
 * "Previous" matters: the current week is deliberately excluded from the
 * demotion set. The cache only lives 30 minutes, so if this week counted, the
 * second build of the week would demote everything the first build just
 * showed and hand back a completely different radar — a Weekly Radar that
 * actually turns over every half hour. Excluding the current week keeps the
 * picks stable from Monday to Sunday and rotates them once, on the boundary.
 *
 * Recently-shown items aren't banned, only demoted — a thin pool should still
 * fill the shelf rather than leave a gap.
 */
function rotate(pool, count, { seen, avoidWeeks, seed, keyOf }) {
  if (pool.length === 0) return []
  const shuffled = seededShuffle(pool, seed)
  const unseen = []
  const repeats = []
  for (const item of shuffled) {
    if (avoidWeeks.includes(seen[keyOf(item)])) repeats.push(item)
    else unseen.push(item)
  }
  return [...unseen, ...repeats].slice(0, count)
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

function normalizeForMatch(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Does this search result actually describe the work we asked about?
 *
 * Cover lookups used to take the first result that had an image, whatever it
 * was. That put a romance novel's cover on a Booker nominee: the search for
 * "Love Forms Claire Adam" matched an unrelated book on the author's first
 * name, and it outranked the real one because an older title has more
 * ratings. A wrong cover is worse than no cover — the gradient fallback at
 * least shows the right title — so a result now has to match before we use it.
 *
 * Prefix matching, not equality, because providers append subtitles and
 * edition markers ("Seascraper: A Novel").
 */
function titleMatches(candidate, wanted) {
  const a = normalizeForMatch(candidate)
  const b = normalizeForMatch(wanted)
  if (!a || !b) return false
  return a === b || a.startsWith(b) || b.startsWith(a)
}

async function spotifyCoverFor(title, creator, signal) {
  const query = `${title} ${creator || ''}`.trim()
  if (!query) return ''
  try {
    const res = await fetch(
      `/.netlify/functions/spotify-search?q=${encodeURIComponent(query.slice(0, 100))}`,
      { signal }
    )
    if (!res.ok) return ''
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return ''
    const data = await res.json()
    const hit = (data.results || []).find((r) => r.coverUrl && titleMatches(r.title, title))
    return hit?.coverUrl || ''
  } catch {
    return ''
  }
}

async function enrichCoverArt(items, { signal } = {}) {
  return Promise.all(
    items.map(async (item) => {
      if (item.coverUrl) return item
      if (!item.title) return item
      try {
        let coverUrl = ''
        if (item.type === 'music') {
          coverUrl = await spotifyCoverFor(item.title, item.creator, signal)
        } else if (item.type === 'movie' || item.type === 'tv') {
          const results = await searchTMDB(item.title, { signal })
          const match =
            results.find((r) => r.type === item.type && r.coverUrl && titleMatches(r.title, item.title)) ||
            results.find((r) => r.coverUrl && titleMatches(r.title, item.title))
          coverUrl = match?.coverUrl || ''
        } else if (item.type === 'book') {
          // Operator-scoped, so the title and author are matched as separate
          // fields. Passing "<title> <author>" as one blob let the blended
          // search match either string anywhere and return the wrong book.
          const query = item.creator
            ? `intitle:"${item.title}" inauthor:"${item.creator}"`
            : `intitle:"${item.title}"`
          const results = await searchGoogleBooks(query, { signal })
          coverUrl = results.find((r) => r.coverUrl && titleMatches(r.title, item.title))?.coverUrl || ''
        }
        return coverUrl ? { ...item, coverUrl } : item
      } catch {
        return item
      }
    })
  )
}

/**
 * Award nominees + winners, via the awards-radar function (Wikidata).
 * Coverage is genuinely partial — see the note in the function — so this
 * returning a short list, or nothing, is a normal outcome rather than a
 * failure to handle loudly.
 */
async function fetchAccolades({ signal } = {}) {
  try {
    const res = await fetch('/.netlify/functions/awards-radar', { signal })
    if (!res.ok) return []
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return []
    const data = await res.json()
    return Array.isArray(data.items) ? data.items : []
  } catch (err) {
    if (err.name !== 'AbortError') console.warn('awards-radar fetch failed', err.message)
    return []
  }
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
 * Real-user radar — five generic buckets:
 *
 *   NEW & TRENDING: strictly current releases and brand-new list arrivals.
 *   COMING SOON:    not out yet. Films and series with a dated release ahead
 *                   of us. Books are missing here on purpose — see below.
 *   HYPED:          popular + well-reviewed (top critic-scored TMDB by
 *                   popularity, top NYT bestsellers, Pitchfork BNM albums).
 *   CRITICS' DARLINGS: NYT-reviewed books, top critic-scored screen, more
 *                   Pitchfork "Best New Music". Things the press loves.
 *   RECENT ACCOLADES: award nominees and winners, from Wikidata.
 *
 * All real data from APIs we already use — no LLM recall, no hallucinated
 * picks. No personalization either; same dispatch for everyone.
 *
 * Each bucket takes a POOL several times larger than what it shows and then
 * rotates through it (see `rotate`), so a book that sits on the NYT list for
 * six months doesn't sit on the radar for six months.
 *
 * No upcoming books: there is no free feed of forthcoming titles. Google
 * Books' `orderBy=newest` sorts by when a volume was INDEXED, not published,
 * so it returns decades-old books and no future dates at all; the NYT Books
 * API only covers what's already selling. Rather than fake it, Coming Soon is
 * screen-only until there's a real source.
 */
async function buildRealRadar({ signal, uid = 'anonymous' } = {}) {
  const [music, movies, tv, booksNYT, pitchfork, upcomingMovies, upcomingTV, accoladeItems] =
    await Promise.all([
      fetchSpotifyNewReleases({ signal }),
      fetchTMDBNewMovies(40, { signal }),
      fetchTMDBNewTV(40, { signal }),
      fetchNYTBestsellers(30, { signal }),
      fetchPitchforkBNM({ signal }),
      fetchTMDBUpcomingMovies(20, { signal }),
      fetchTMDBUpcomingTV(20, { signal }),
      fetchAccolades({ signal }),
    ])

  const tag = (items, bucket, extras = () => ({})) =>
    items.map((it) => ({ ...it, bucket, isTastemaker: true, ...extras(it) }))

  const daysOld = (d) => (d ? (Date.now() - new Date(d).getTime()) / 86400000 : Infinity)
  const daysAhead = (d) => (d ? (new Date(d).getTime() - Date.now()) / 86400000 : -Infinity)
  // Key on type+title (not externalId): the same work can carry different
  // provider ids across editions, and a duplicate title IS the bug.
  const itemKey = (it) => `${it.type}:${(it.title || '').toLowerCase().trim()}`

  // Rotation state — one seed for the whole build so the buckets shuffle
  // together and stay stable for the week.
  const seen = readSeen(uid)
  // recentWeeks[0] is the current week — kept for pruning the store, dropped
  // from the demotion set so rebuilds within a week stay stable.
  const recentWeeks = recentWeekKeys(REPEAT_MEMORY_WEEKS)
  const avoidWeeks = recentWeeks.slice(1)
  const seed = hashString(`${uid}:${weekKey()}`)

  // "Not for me" picks are dropped from the pools rather than filtered out at
  // render, so their slot gets backfilled with the next candidate instead of
  // leaving the shelf a tile short.
  const dismissed = readCachedDismissed(uid)
  const spin = (pool, count) =>
    rotate(pool.filter((it) => !dismissed.has(pickKey(it))), count, { seen, avoidWeeks, seed, keyOf: itemKey })

  // ── NEW & TRENDING — strictly current, built first so the other buckets
  // can exclude anything shown here. This is the antidote to list warhorses
  // (a book can sit on the NYT list for a year; it isn't *new*).
  const freshBookPool = booksNYT
    .filter((b) => (b.weeksOnList ?? 99) <= 4)
    .sort((a, b) => (a.rank || 99) - (b.rank || 99))
  const freshMoviePool = movies
    .filter((m) => daysOld(m.releaseDate) <= 21 && (m.voteCount || 0) >= 10)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  const freshTVPool = tv
    .filter((t) => daysOld(t.releaseDate) <= 30 && (t.voteCount || 0) >= 5)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  const freshPitchforkPool = pitchfork.filter((p) => daysOld(p.releaseDate) <= 14)

  const fresh = [
    ...tag(spin(freshBookPool, 3), 'fresh', (b) => ({
      source: (b.weeksOnList ?? 99) <= 1 ? 'Debuted on the NYT list this week' : `New to the NYT list${b.rank ? ` · #${b.rank}` : ''}`,
      blurb: b.description || '',
    })),
    ...tag(spin(freshMoviePool, 2), 'fresh', (m) => ({ source: 'Just released · trending', blurb: m.description || '' })),
    ...tag(spin(freshTVPool, 2), 'fresh', (t) => ({ source: 'Just premiered · trending', blurb: t.description || '' })),
    ...tag(spin(freshPitchforkPool, 2), 'fresh'),
    // Spotify tag:new is inherently ≤ ~2 weeks old — it lives here.
    ...tag(spin(music || [], 2), 'fresh', () => ({ source: 'New on Spotify', blurb: '' })),
  ]
  const usedKeys = new Set(fresh.map(itemKey))
  // Drops both already-placed picks and dismissed ones. Coming Soon and
  // Accolades take their slices straight from here rather than through
  // `spin`, so the dismissal filter has to live at this level too.
  const unused = (items) =>
    items.filter((it) => !usedKeys.has(itemKey(it)) && !dismissed.has(pickKey(it)))

  // ── COMING SOON ── dated, not out yet. Sorted by how close it is, because
  // "next week" is more useful than "in four months".
  const soonPool = [...upcomingMovies, ...upcomingTV]
    .filter((it) => daysAhead(it.releaseDate) > 0)
    .sort((a, b) => daysAhead(a.releaseDate) - daysAhead(b.releaseDate))
  // Rotation is deliberately NOT applied here: a release calendar that
  // shuffles is a worse calendar. The list churns on its own as dates pass.
  const soon = tag(unused(soonPool).slice(0, 8), 'soon', (it) => ({
    source: releaseCountdown(it.releaseDate),
    blurb: it.description || '',
  }))
  soon.forEach((it) => usedKeys.add(itemKey(it)))

  // ── HYPED ── (long-running list warhorses capped at ~2 months so the same
  // titles don't park here forever)
  const hypedMoviePool = movies
    .filter((m) => (m.voteAverage || 0) >= 7 && (m.voteCount || 0) >= 100)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  const hypedTVPool = tv
    .filter((t) => (t.voteAverage || 0) >= 7 && (t.voteCount || 0) >= 50)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  const hypedBookPool = booksNYT
    .filter((b) => (b.rank || 99) <= 8 && (b.weeksOnList ?? 99) <= 8)
    .sort((a, b) => (a.weeksOnList ?? 99) - (b.weeksOnList ?? 99))

  const hyped = [
    ...tag(spin(unused(hypedBookPool), 3), 'hyped', (b) => ({ source: `NYT Best Seller${b.rank ? ` · #${b.rank}` : ''}`, blurb: b.description || 'A current New York Times best seller.' })),
    ...tag(spin(unused(hypedMoviePool), 3), 'hyped', (m) => ({ source: `Critics ${m.voteAverage.toFixed(1)}/10 · trending`, blurb: m.description || '' })),
    ...tag(spin(unused(hypedTVPool), 3), 'hyped', (t) => ({ source: `Critics ${t.voteAverage.toFixed(1)}/10 · trending`, blurb: t.description || '' })),
    // Music: Pitchfork is the reliable backbone (real titles + real review
    // URLs). Each pick keeps its own honest source/review tag.
    ...tag(spin(unused(pitchfork), 2), 'hyped'),
  ]
  hyped.forEach((it) => usedKeys.add(itemKey(it)))

  // ── CRITICS' DARLINGS ──
  const reviewedBookPool = booksNYT.filter((b) => b.reviewUrl)
  const acclaimedMoviePool = movies
    .filter((m) => (m.voteAverage || 0) >= 7.6 && (m.voteCount || 0) >= 200)
    .sort((a, b) => (b.voteAverage || 0) - (a.voteAverage || 0))
  const acclaimedTVPool = tv
    .filter((t) => (t.voteAverage || 0) >= 7.6 && (t.voteCount || 0) >= 100)
    .sort((a, b) => (b.voteAverage || 0) - (a.voteAverage || 0))

  const darlings = [
    ...tag(spin(unused(reviewedBookPool), 3), 'darlings', () => ({ source: 'New York Times · reviewed', blurb: '' })),
    ...tag(spin(unused(pitchfork), 3), 'darlings'),
    ...tag(spin(unused(acclaimedMoviePool), 2), 'darlings', (m) => ({ source: `Critics' score ${m.voteAverage.toFixed(1)}/10`, blurb: m.description || '' })),
    ...tag(spin(unused(acclaimedTVPool), 2), 'darlings', (t) => ({ source: `Critics' score ${t.voteAverage.toFixed(1)}/10`, blurb: t.description || '' })),
  ]
  darlings.forEach((it) => usedKeys.add(itemKey(it)))

  // ── RECENT ACCOLADES ── already deduped and sorted server-side.
  const accolades = tag(unused(accoladeItems).slice(0, 8), 'accolades', (a) => ({
    source: a.award || 'Award nominee',
    blurb: '',
  }))

  // Backfill cover art for anything missing it (Pitchfork RSS and the Wikidata
  // accolades arrive with none).
  let [freshFinal, soonFinal, hypedFinal, darlingsFinal, accoladesFinal] = await Promise.all([
    enrichCoverArt(fresh, { signal }),
    enrichCoverArt(soon, { signal }),
    enrichCoverArt(hyped, { signal }),
    enrichCoverArt(darlings, { signal }),
    enrichCoverArt(accolades, { signal }),
  ])

  // Enrich TMDB items (movies / TV) with director + lead cast. Cheap parallel
  // calls; missing credits just leave creator/cast empty.
  ;[freshFinal, soonFinal, hypedFinal, darlingsFinal] = await Promise.all([
    enrichTMDBCredits(freshFinal, { signal }),
    enrichTMDBCredits(soonFinal, { signal }),
    enrichTMDBCredits(hypedFinal, { signal }),
    enrichTMDBCredits(darlingsFinal, { signal }),
  ])

  // Remember what went out this week so next week's build can move past it.
  const thisWeek = weekKey()
  const nextSeen = {}
  // Carry forward only the weeks we still care about, so this never grows
  // without bound.
  for (const [key, week] of Object.entries(seen)) {
    if (recentWeeks.includes(week)) nextSeen[key] = week
  }
  for (const item of [...freshFinal, ...hypedFinal, ...darlingsFinal, ...accoladesFinal]) {
    nextSeen[itemKey(item)] = thisWeek
  }
  writeSeen(uid, nextSeen)

  return {
    fresh: freshFinal,
    soon: soonFinal,
    hyped: hypedFinal,
    darlings: darlingsFinal,
    accolades: accoladesFinal,
    generatedAt: new Date().toISOString(),
    isDemo: false,
  }
}

/** "Out Friday" / "Out in 3 weeks" / "Out March 12". */
function releaseCountdown(dateStr) {
  if (!dateStr) return 'Coming soon'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return 'Coming soon'
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (days <= 0) return 'Out now'
  if (days === 1) return 'Out tomorrow'
  if (days <= 7) return `Out in ${days} days`
  if (days <= 28) {
    const weeks = Math.round(days / 7)
    return `Out in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  }
  return `Out ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
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

  const promise = buildRealRadar({ ...opts, uid })
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
