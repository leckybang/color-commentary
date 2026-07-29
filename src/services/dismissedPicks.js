/**
 * Radar picks you've said "Not for me" to.
 *
 * Backed by Supabase so a dismissal follows you between devices. localStorage
 * is kept as a mirror rather than the source of truth, for two reasons:
 *
 *   - The radar builder runs synchronously over its candidate pools and can't
 *     await a network round trip mid-build, so it reads the mirror.
 *   - Demo users have no Supabase row to write to, and an offline session
 *     should still hide what you just dismissed.
 *
 * The Radar page refreshes the mirror from Supabase on mount, so the only
 * window where a build can use stale data is the first build on a device
 * you've never opened before. The page filters dismissed picks at render as
 * well, so even then nothing you've dismissed is actually shown.
 */

import { supabase, shouldSync } from '../lib/syncToSupabase'

/** How long a dismissal sticks in the local mirror. The Supabase row is the
 *  real record; this is only about bounding localStorage growth. */
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

/** Raw `{ key: dismissedAtISO }` from the local mirror, expired entries dropped. */
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

function writeRaw(uid, map) {
  try {
    localStorage.setItem(storeKey(uid), JSON.stringify(map))
  } catch {
    // Quota or private browsing. Supabase still has the record; only the
    // synchronous read path degrades.
  }
}

/**
 * Synchronous read from the local mirror. Used by the radar builder, which
 * can't await mid-build.
 */
export function readCachedDismissed(uid) {
  return new Set(Object.keys(readRaw(uid)))
}

/**
 * Authoritative read. Pulls from Supabase, refreshes the local mirror, and
 * pushes up any local-only dismissals so the ones made before this was
 * server-backed aren't lost.
 */
export async function fetchDismissed(user) {
  const uid = user?.uid
  if (!shouldSync(user)) return readCachedDismissed(uid)

  const local = readRaw(uid)
  const { data, error } = await supabase
    .from('dismissed_picks')
    .select('item_key, dismissed_at')
    .eq('user_id', uid)

  if (error) {
    console.error('Dismissed picks fetch failed:', error.message)
    return new Set(Object.keys(local))
  }

  const merged = {}
  for (const row of data || []) merged[row.item_key] = row.dismissed_at

  // Anything dismissed locally that the server hasn't seen — either from
  // before this synced, or made while offline.
  const missing = Object.keys(local).filter((key) => !(key in merged))
  if (missing.length > 0) {
    const rows = missing.map((key) => ({
      user_id: uid,
      item_key: key,
      type: key.split(':')[0] || null,
      title: key.slice(key.indexOf(':') + 1) || null,
      dismissed_at: local[key],
    }))
    supabase
      .from('dismissed_picks')
      .upsert(rows, { onConflict: 'user_id,item_key' })
      .then(({ error: e }) => { if (e) console.error('Dismissed picks backfill failed:', e.message) })
    for (const key of missing) merged[key] = local[key]
  }

  writeRaw(uid, merged)
  return new Set(Object.keys(merged))
}

/**
 * Record a dismissal. Writes the mirror first so the UI updates immediately,
 * then persists. Returns the updated Set so callers can drop it into state
 * without a re-read.
 */
export function dismissPick(user, item) {
  const uid = user?.uid
  const key = pickKey(item)
  if (!key) return readCachedDismissed(uid)

  const at = new Date().toISOString()
  const next = { ...readRaw(uid), [key]: at }
  writeRaw(uid, next)

  if (shouldSync(user)) {
    supabase
      .from('dismissed_picks')
      .upsert(
        { user_id: uid, item_key: key, type: item.type || null, title: item.title || null, dismissed_at: at },
        { onConflict: 'user_id,item_key' }
      )
      .then(({ error }) => { if (error) console.error('Dismiss save failed:', error.message) })
  }

  return new Set(Object.keys(next))
}
