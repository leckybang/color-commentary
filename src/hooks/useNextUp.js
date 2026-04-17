import { useState, useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase, shouldSync, isRealUuid } from '../lib/syncToSupabase'

const MAX_NEXT_UP = 3

/**
 * Next Up — the user's Top 3 pinned "Want to Try" catalog items, orderable.
 * Stored in Supabase's next_up_items table (user-scoped, with position ints).
 * Uses the same delete-all + bulk-insert sync pattern as useHeavyRotation.
 */
export function useNextUp() {
  const { user } = useAuth()
  const [itemIds, setItemIds] = useState([])
  const syncTimerRef = useRef(null)

  const storageKey = user ? `cc_next_up_${user.uid}` : null
  const canSync = shouldSync(user)

  useEffect(() => {
    if (!storageKey) return

    const saved = localStorage.getItem(storageKey)
    if (saved) setItemIds(JSON.parse(saved))

    if (canSync) {
      supabase
        .from('next_up_items')
        .select('catalog_item_id, position')
        .eq('user_id', user.uid)
        .order('position', { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.error('Next Up fetch failed:', error.message)
            return
          }
          if (data) {
            const ids = data.map((r) => r.catalog_item_id)
            setItemIds(ids)
            if (storageKey) localStorage.setItem(storageKey, JSON.stringify(ids))
          }
        })
    }
  }, [storageKey, canSync, user?.uid])

  // Debounced sync — replace all rows
  const scheduleSync = (ids) => {
    if (!canSync) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(async () => {
      try {
        const { error: delErr } = await supabase
          .from('next_up_items')
          .delete()
          .eq('user_id', user.uid)
        if (delErr) {
          console.error('Next Up delete failed:', delErr.message)
          return
        }

        const rows = ids
          .filter((id) => isRealUuid(id))
          .map((id, position) => ({
            id: crypto.randomUUID(),
            user_id: user.uid,
            catalog_item_id: id,
            position,
          }))

        if (rows.length > 0) {
          const { error } = await supabase.from('next_up_items').insert(rows)
          if (error) console.error('Next Up insert failed:', error.message)
        }
      } catch (err) {
        console.error('Next Up sync error:', err)
      }
    }, 500)
  }

  const save = (updated) => {
    setItemIds(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
    scheduleSync(updated)
  }

  const addToNextUp = (itemId) => {
    if (itemIds.length >= MAX_NEXT_UP || itemIds.includes(itemId)) return
    save([...itemIds, itemId])
  }

  const removeFromNextUp = (itemId) => {
    save(itemIds.filter((id) => id !== itemId))
  }

  const reorder = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= itemIds.length) return
    if (toIndex < 0 || toIndex >= itemIds.length) return
    const updated = [...itemIds]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    save(updated)
  }

  const isInNextUp = (itemId) => itemIds.includes(itemId)

  const isFull = itemIds.length >= MAX_NEXT_UP

  return { itemIds, addToNextUp, removeFromNextUp, reorder, isInNextUp, isFull, MAX_NEXT_UP }
}
