import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { normalizeRating } from '../utils/ratingUtils'
import { sanitizeVibeTags } from '../data/vibeTags'

/**
 * Fetches the catalog items for a specific user (someone other than the
 * currently signed-in viewer). Used on the public profile view so a follower
 * can see another user's stats, Current Favorites, and Right Now.
 *
 * Reads are gated by the Supabase RLS policy "Anyone can read catalog of
 * public profiles" — without that policy, this hook returns an empty array
 * even for valid public users. See docs/SUPABASE_MIGRATIONS.md.
 *
 * Returns { items, loading, error }.
 */
export function useUserCatalog(userId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(!!userId)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      // Defer to a microtask so setState doesn't fire synchronously inside
      // the effect (react-hooks/set-state-in-effect rule).
      Promise.resolve().then(() => {
        setItems([])
        setLoading(false)
      })
      return
    }

    let cancelled = false
    Promise.resolve().then(() => {
      setLoading(true)
      setError(null)
    })

    supabase
      .from('catalog_items')
      .select('*')
      .eq('user_id', userId)
      .order('date_added', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(err.message)
          setItems([])
        } else {
          setItems(
            (data || []).map((row) => ({
              id: row.id,
              title: row.title,
              creator: row.creator || '',
              type: row.type,
              genre: row.genre || '',
              status: row.status || 'want',
              rating: normalizeRating(row.rating),
              vibeTags: sanitizeVibeTags(row.vibe_tags),
              review: row.review || '',
              coverUrl: row.cover_url || '',
              year: row.year || '',
              dateAdded: row.date_added || row.created_at,
              dateConsumed: row.date_consumed || null,
            }))
          )
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [userId])

  return { items, loading, error }
}
