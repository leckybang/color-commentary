import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Who a given user follows — for friend-of-friend discovery on public
 * profiles. RLS only exposes following lists of PUBLIC profiles, and the
 * profile hydration only returns public people, so private accounts never
 * leak. Returns { people, loading }.
 */
export function useUserFollowing(userId) {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      Promise.resolve().then(() => {
        setPeople([])
        setLoading(false)
      })
      return
    }
    let cancelled = false
    Promise.resolve().then(() => setLoading(true))
    ;(async () => {
      const { data: edges, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
      if (cancelled) return
      const ids = (edges || []).map((e) => e.following_id)
      if (error || ids.length === 0) {
        setPeople([])
        setLoading(false)
        return
      }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_emoji, archetype')
        .in('id', ids)
        .eq('is_public', true)
      if (cancelled) return
      setPeople(
        (profiles || []).map((p) => ({
          userId: p.id,
          displayName: p.display_name || 'User',
          username: p.username || '',
          avatarEmoji: p.avatar_emoji || '',
          archetype: p.archetype || '',
        }))
      )
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { people, loading }
}
