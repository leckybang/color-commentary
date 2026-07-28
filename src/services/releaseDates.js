/**
 * Release-date lookup for catalog items.
 *
 * Discovery ("what's coming that I don't know about") is a feed problem, and
 * for books there is no free feed — see the Coming Soon note in radar.js.
 * But *lookup* ("I already added Taipei, when is it out?") is a different and
 * much easier problem: every provider returns a publication date when you
 * search for a specific title. This module does that lookup, one item at a
 * time, so the Radar can tell you which of your own Want-to-Try items are
 * still ahead of you.
 *
 * Dates come back at varying precision — "2027", "2026-11", "2026-11-04" —
 * and are kept exactly as reported rather than padded out to a fake day.
 * Because they're ISO-prefixed, string comparison still orders them correctly.
 */

import { searchTMDB } from './providers/tmdb'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1'
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

/** Today as an ISO date string, for comparing against release dates. */
export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Is this release date still ahead of us?
 *
 * Lexicographic on purpose. A bare "2026" compares as less than "2026-07-28",
 * so a year-only date in the current year reads as already out — which is the
 * right call when we don't know the month, let alone the day.
 */
export function isUpcoming(releaseDate, today = todayISO()) {
  if (!releaseDate) return false
  return String(releaseDate) > today
}

/** "Out November 4" / "Out November 2026" / "Out sometime in 2027". */
export function formatReleaseWindow(releaseDate) {
  if (!releaseDate) return ''
  const [year, month, day] = String(releaseDate).split('-')
  if (!month) return `Out sometime in ${year}`

  const monthName = MONTHS[Number(month) - 1] || ''
  if (!day) return `Out ${monthName} ${year}`

  const date = new Date(`${releaseDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return `Out ${monthName} ${year}`

  const days = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (days <= 0) return 'Out now'
  if (days === 1) return 'Out tomorrow'
  if (days <= 7) return `Out in ${days} days`
  if (days <= 28) {
    const weeks = Math.round(days / 7)
    return `Out in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  }
  return `Out ${monthName} ${Number(day)}`
}

function normalizeTitle(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Books — a single targeted query rather than the three-probe blend
 * searchGoogleBooks uses. This runs across a whole watchlist, and the blend
 * would triple the quota cost for no benefit: we already know the title.
 */
async function lookupBookDate(item, { signal } = {}) {
  const title = (item.title || '').trim()
  if (!title) return null

  const parts = [`intitle:"${title}"`]
  if (item.creator) parts.push(`inauthor:"${item.creator.trim()}"`)
  const keyParam = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ''
  const url = `${GOOGLE_BOOKS_BASE}/volumes?q=${encodeURIComponent(parts.join(' '))}&maxResults=10&printType=books&langRestrict=en${keyParam}`

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const data = await res.json()
    const wanted = normalizeTitle(title)

    // Editions of the same work carry different dates (hardback, paperback,
    // audio). Take the EARLIEST — that's the release the user is waiting for,
    // not a reissue two years later.
    let best = null
    for (const volume of data.items || []) {
      const info = volume.volumeInfo || {}
      if (normalizeTitle(info.title) !== wanted) continue
      const published = info.publishedDate
      if (!published) continue
      if (!best || published < best) best = published
    }
    return best
  } catch (err) {
    if (err.name !== 'AbortError') console.warn('Book release lookup failed', title, err.message)
    return null
  }
}

/** Movies and TV — TMDB's multi-search already carries the full date. */
async function lookupScreenDate(item, { signal } = {}) {
  const results = await searchTMDB(item.title, { signal })
  const wanted = normalizeTitle(item.title)
  const match =
    results.find((r) => r.type === item.type && normalizeTitle(r.title) === wanted) ||
    results.find((r) => normalizeTitle(r.title) === wanted)
  // searchTMDB narrows to `year`; re-read the raw date off the same shape when
  // it's there, otherwise fall back to the year alone.
  return match?.releaseDate || match?.year || null
}

/** Music — via the Spotify proxy, which reports album release dates. */
async function lookupMusicDate(item, { signal } = {}) {
  const query = `${item.title} ${item.creator || ''}`.trim()
  if (!query) return null
  try {
    const res = await fetch(
      `/.netlify/functions/spotify-search?q=${encodeURIComponent(query.slice(0, 100))}`,
      { signal }
    )
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return null
    const data = await res.json()
    const wanted = normalizeTitle(item.title)
    const match = (data.results || []).find((r) => normalizeTitle(r.title) === wanted)
    return match?.releaseDate || match?.year || null
  } catch (err) {
    if (err.name !== 'AbortError') console.warn('Music release lookup failed', item.title, err.message)
    return null
  }
}

const LOOKUPS = {
  book: lookupBookDate,
  movie: lookupScreenDate,
  tv: lookupScreenDate,
  music: lookupMusicDate,
}

/**
 * Best-effort release date for one item. Returns a date string at whatever
 * precision the provider reported, or null when nothing matched — null is a
 * normal answer (most catalog items are old), not an error.
 */
export async function lookupReleaseDate(item, { signal } = {}) {
  const lookup = LOOKUPS[item?.type]
  if (!lookup || !item?.title) return null
  return lookup(item, { signal })
}

/**
 * Is this item worth spending a lookup on?
 *
 * The cheap rejections first: anything already known to be from a past year
 * can't be upcoming, and re-checking a date we've already confirmed is in the
 * past is pure quota burn.
 */
const RECHECK_AFTER_MS = 30 * 24 * 60 * 60 * 1000

export function needsReleaseLookup(item, now = Date.now()) {
  if (!item || item.status !== 'want') return false
  if (!LOOKUPS[item.type] || !item.title) return false

  // A year we already have that's in the past settles it without a request.
  const year = parseInt(item.year, 10)
  if (year && year < new Date(now).getFullYear()) return false

  const checkedAt = item.releaseDateCheckedAt ? new Date(item.releaseDateCheckedAt).getTime() : 0
  if (!checkedAt) return true

  // Already confirmed as out — the answer can't change.
  if (item.releaseDate && !isUpcoming(item.releaseDate)) return false

  // Unknown, or still upcoming: dates get firmed up over time, so re-check
  // occasionally.
  return now - checkedAt > RECHECK_AFTER_MS
}
