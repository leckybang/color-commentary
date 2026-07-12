import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { supabase, shouldSync } from '../lib/syncToSupabase'

/** The reaction palette. Small on purpose: taps, not a keyboard. */
export const REACTION_EMOJI = ['❤️', '🔥', '😭', '👀']

/**
 * useItemReactions — emoji reactions for a set of catalog item ids
 * (typically the friends feed). Returns per-item counts, which ones are
 * yours, and an optimistic toggle. Demo mode gets a no-op so the UI hides.
 */
export function useItemReactions(itemIds) {
  const { user } = useAuth()
  const canSync = shouldSync(user)
  const [rows, setRows] = useState([])

  const idsKey = useMemo(() => [...itemIds].sort().join(','), [itemIds])

  useEffect(() => {
    if (!canSync || !idsKey) {
      Promise.resolve().then(() => setRows([]))
      return
    }
    let cancelled = false
    supabase
      .from('item_reactions')
      .select('item_id, reactor_id, emoji')
      .in('item_id', idsKey.split(','))
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.warn('reactions fetch failed:', error.message)
          setRows([])
        } else {
          setRows(data || [])
        }
      })
    return () => {
      cancelled = true
    }
  }, [canSync, idsKey])

  // {itemId: {emoji: count}} and the set of my own `${itemId}:${emoji}`
  const { counts, mine } = useMemo(() => {
    const counts = {}
    const mine = new Set()
    for (const r of rows) {
      counts[r.item_id] = counts[r.item_id] || {}
      counts[r.item_id][r.emoji] = (counts[r.item_id][r.emoji] || 0) + 1
      if (user && r.reactor_id === user.uid) mine.add(`${r.item_id}:${r.emoji}`)
    }
    return { counts, mine }
  }, [rows, user])

  const toggle = useCallback(
    (itemId, emoji) => {
      if (!canSync || !user) return
      const key = `${itemId}:${emoji}`
      if (mine.has(key)) {
        setRows((prev) => prev.filter((r) => !(r.item_id === itemId && r.emoji === emoji && r.reactor_id === user.uid)))
        supabase
          .from('item_reactions')
          .delete()
          .eq('item_id', itemId)
          .eq('reactor_id', user.uid)
          .eq('emoji', emoji)
          .then(({ error }) => {
            if (error) console.warn('un-react failed:', error.message)
          })
      } else {
        setRows((prev) => [...prev, { item_id: itemId, reactor_id: user.uid, emoji }])
        supabase
          .from('item_reactions')
          .insert({ item_id: itemId, reactor_id: user.uid, emoji })
          .then(({ error }) => {
            if (error) {
              console.warn('react failed:', error.message)
              setRows((prev) => prev.filter((r) => !(r.item_id === itemId && r.emoji === emoji && r.reactor_id === user.uid)))
            }
          })
      }
    },
    [canSync, user, mine]
  )

  return { enabled: canSync, counts, mine, toggle }
}
