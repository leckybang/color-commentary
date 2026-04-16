import { useState, useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase, shouldSync, isRealUuid } from '../lib/syncToSupabase'

/**
 * Heavy Rotation / Current Favorites — ordered list of up to 8 catalog item IDs.
 * Synced to heavy_rotation_items table. On save, deletes all existing rows for the
 * user then bulk-inserts the new ordering. Simple and keeps positions consistent.
 */
export function useHeavyRotation() {
  const { user } = useAuth()
  const [itemIds, setItemIds] = useState([])
  const syncTimerRef = useRef(null)

  const storageKey = user ? `cc_rotation_${user.uid}` : null
  const canSync = shouldSync(user)

  useEffect(() => {
    if (!storageKey) return

    const saved = localStorage.getItem(storageKey)
    if (saved) setItemIds(JSON.parse(saved))

    if (canSync) {
      supabase
        .from('heavy_rotation_items')
        .select('catalog_item_id, position')
        .eq('user_id', user.uid)
        .order('position', { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.error('Heavy rotation fetch failed:', error.message)
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
        // Delete all existing
        const { error: delErr } = await supabase
          .from('heavy_rotation_items')
          .delete()
          .eq('user_id', user.uid)
        if (delErr) {
          console.error('Heavy rotation delete failed:', delErr.message)
          return
        }

        // Bulk insert (only sync real UUIDs — old localStorage items can't go to Supabase)
        const rows = ids
          .filter((id) => isRealUuid(id))
          .map((id, position) => ({
            id: crypto.randomUUID(),
            user_id: user.uid,
            catalog_item_id: id,
            position,
          }))

        if (rows.length > 0) {
          const { error } = await supabase.from('heavy_rotation_items').insert(rows)
          if (error) console.error('Heavy rotation insert failed:', error.message)
        }
      } catch (err) {
        console.error('Heavy rotation sync error:', err)
      }
    }, 500)
  }

  const save = (updated) => {
    setItemIds(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
    scheduleSync(updated)
  }

  const addToRotation = (itemId) => {
    if (itemIds.length >= 8 || itemIds.includes(itemId)) return
    save([...itemIds, itemId])
  }

  const removeFromRotation = (itemId) => {
    save(itemIds.filter((id) => id !== itemId))
  }

  const reorder = (fromIndex, toIndex) => {
    const updated = [...itemIds]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    save(updated)
  }

  const setRotation = (ids) => save(ids.slice(0, 8))

  return { itemIds, addToRotation, removeFromRotation, reorder, setRotation }
}
