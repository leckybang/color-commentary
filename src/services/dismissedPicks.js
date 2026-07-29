/**
 * Radar picks you've said "Not for me" to.
 *
 * This used to be component state, which meant a dismissal lasted exactly as
 * long as you stayed on the Radar page — navigate away and the pick came
 * straight back. Dismissals now persist per user.
 *
 * Two places consume this, and both matter:
 *   - The Radar page filters them out of what it renders, so the tile
 *     disappears the moment you dismiss it (the built radar is cached for 30
 *     minutes, so waiting for a rebuild would feel broken).
 *   - The radar builder drops them from its candidate pools, so the next
 *     build backfills the slot with something else instead of leaving a gap.
 */

/** How long a dismissal sticks. Long, but not forever: a year on, a pick
 *  resurfacing is a re-recommendation rather than an ignored preference. */
const DISMISS_TTL_MS = 365 * 24 * 60 * 60 * 1000

function storeKey(uid) {
  return `cc_radar_dismissed_v1_${uid || 'anonymous'}`
}

/**
 * Keyed on type + title, not title alone. A book and a film can share a name,
 * and dismissing one shouldn't silently bury the other. This matches the
 * itemKey the radar builder uses for deduping.
 */
export function pickKey(item) {
  if (!item) return ''
  return `${item.type}:${String(item.title || '').toLowerCase().trim()}`
}

/** Raw `{ key: dismissedAtISO }`, expired entries dropped. */
function readRaw(uid) {
  try {
    const raw = localStorage.getItem(storeKey(uid))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const cutoff = Date.now() - DISMISS_TTL_MS
    const fresh = {}
    for (const [key, at] of Object.entries(parsed)) {
      if (new Date(at).getTime() >= cutoff) fresh[key] = at
    }
    return fresh
  } catch {
    return {}
  }
}

/** The set of currently-dismissed pick keys for this user. */
export function readDismissed(uid) {
  return new Set(Object.keys(readRaw(uid)))
}

/**
 * Record a dismissal. Returns the updated Set so callers can drop it straight
 * into state without a second read.
 */
export function addDismissed(uid, item) {
  const key = pickKey(item)
  if (!key) return readDismissed(uid)

  const next = { ...readRaw(uid), [key]: new Date().toISOString() }
  try {
    localStorage.setItem(storeKey(uid), JSON.stringify(next))
  } catch {
    // Quota or private browsing. The in-memory Set below still hides the pick
    // for this session, which is the old behaviour — no worse than before.
  }
  return new Set(Object.keys(next))
}
