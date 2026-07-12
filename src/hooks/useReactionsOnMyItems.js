import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { useCatalog } from './useCatalog'
import { supabase, shouldSync, isRealUuid } from '../lib/syncToSupabase'

const SEEN_EVENT = 'cc-reactions-seen'

/**
 * Reactions other people left on YOUR catalog items. Powers the Friends nav
 * dot (alongside new followers) and the "On your items" strip on the Friends
 * page. Seen-state mirrors useNewFollowers: a localStorage timestamp plus a
 * window event so every subscriber stays in sync.
 */
export function useReactionsOnMyItems(limit = 12) {
  const { user } = useAuth()
  const { items } = useCatalog()
  const canSync = shouldSync(user)
  const seenKey = user ? `cc_reactions_seen_${user.uid}` : null
  const [rows, setRows] = useState([])
  const [, bump] = useState(0)

  useEffect(() => {
    const onChange = () => bump((v) => v + 1)
    window.addEventListener(SEEN_EVENT, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(SEEN_EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  const myIds = useMemo(() => items.map((i) => i.id).filter(isRealUuid), [items])
  const idsKey = myIds.sort().join(',')

  useEffect(() => {
    if (!canSync || !idsKey || !user) {
      Promise.resolve().then(() => setRows([]))
      return
    }
    let cancelled = false
    supabase
      .from('item_reactions')
      .select('id, item_id, emoji, created_at, reactor:profiles!reactor_id(display_name, username)')
      .in('item_id', idsKey.split(','))
      .neq('reactor_id', user.uid)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.warn('my-item reactions fetch failed:', error.message)
          setRows([])
        } else {
          setRows(data || [])
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSync, idsKey, user?.uid, limit])

  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const reactions = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        emoji: r.emoji,
        at: r.created_at,
        itemTitle: byId[r.item_id]?.title || 'something you cataloged',
        reactorName: r.reactor?.display_name || 'Someone',
        reactorUsername: r.reactor?.username || '',
      })),
    [rows, byId]
  )

  const lastSeen = seenKey ? localStorage.getItem(seenKey) || '' : ''
  const newReactionCount = reactions.filter((r) => !lastSeen || r.at > lastSeen).length

  const markReactionsSeen = useCallback(() => {
    if (!seenKey) return
    localStorage.setItem(seenKey, new Date().toISOString())
    window.dispatchEvent(new Event(SEEN_EVENT))
  }, [seenKey])

  return { reactions, newReactionCount, markReactionsSeen }
}
