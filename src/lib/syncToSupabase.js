import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Returns true if we should sync this user's data to Supabase.
 * Demo users and legacy localStorage-only users skip Supabase entirely.
 */
export function shouldSync(user) {
  if (!isSupabaseConfigured || !user?.uid) return false
  if (user.uid.startsWith('demo')) return false
  if (user.uid.startsWith('user-')) return false // Legacy localStorage user IDs
  return true
}

/**
 * Detects if an item ID is a real UUID (vs an old localStorage-generated ID like "item-169...").
 * Used to decide whether to sync a specific item to Supabase.
 */
export function isRealUuid(id) {
  if (!id || typeof id !== 'string') return false
  // Basic UUID v4 check: 8-4-4-4-12 hex characters
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export { supabase }
