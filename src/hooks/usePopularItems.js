import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { supabase, shouldSync } from '../lib/syncToSupabase'

/**
 * Popular with Users — items that multiple people added to their catalogs
 * recently, via the popular_items() RPC (an anonymous aggregate: counts only,
 * no attribution). Signed-in users only; demo mode gets an empty list so the
 * widget hides itself.
 */
export function usePopularItems({ daysBack = 30, minUsers = 2, maxRows = 6 } = {}) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const canSync = shouldSync(user)

  useEffect(() => {
    if (!canSync) {
      // Defer so setState doesn't fire synchronously inside the effect
      // (matches the pattern in useWeeklyRadar).
      Promise.resolve().then(() => setItems([]))
      return
    }
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true)
    })
    supabase
      .rpc('popular_items', { days_back: daysBack, min_users: minUsers, max_rows: maxRows })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.warn('popular_items failed:', error.message)
          setItems([])
        } else {
          setItems(
            (data || []).map((r) => ({
              title: r.title,
              creator: r.creator || '',
              type: r.item_type,
              coverUrl: r.cover_url || '',
              userCount: Number(r.user_count),
            }))
          )
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canSync, daysBack, minUsers, maxRows])

  return { items, loading }
}
