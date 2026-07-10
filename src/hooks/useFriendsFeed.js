import { useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { useFriends } from './useFriends'
import { supabase, shouldSync } from '../lib/syncToSupabase'

// Demo-mode feed so the page feels alive before real friends show up.
const MOCK_FEED = {
  'mock-1': [
    { title: 'Tomorrow, and Tomorrow, and Tomorrow', creator: 'Gabrielle Zevin', type: 'book', status: 'finished', rating: 5, hoursAgo: 3 },
    { title: 'Past Lives', creator: 'Celine Song', type: 'movie', status: 'want', rating: 0, hoursAgo: 26 },
  ],
  'mock-2': [
    { title: 'Severance', creator: 'Dan Erickson', type: 'tv', status: 'watching', rating: 0, hoursAgo: 7 },
  ],
  'mock-3': [
    { title: 'In Rainbows', creator: 'Radiohead', type: 'music', status: 'finished', rating: 4, hoursAgo: 49 },
  ],
  'mock-4': [
    { title: 'The Bear', creator: 'Christopher Storer', type: 'tv', status: 'finished', rating: 5, hoursAgo: 80 },
  ],
  'mock-5': [
    { title: 'Challengers', creator: 'Luca Guadagnino', type: 'movie', status: 'watching', rating: 0, hoursAgo: 12 },
  ],
}

/**
 * Recent catalog activity from the people you follow.
 *
 * Reads friends' catalog_items directly — RLS only returns rows for friends
 * whose profiles are public, so a private friend simply contributes nothing.
 * Each entry: { id, userId, displayName, avatarEmoji, username, title,
 * creator, type, status, rating, coverUrl, at }.
 */
export function useFriendsFeed(limit = 25) {
  const { user } = useAuth()
  const { following } = useFriends()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const canSync = shouldSync(user)
  const followingKey = useMemo(
    () => following.map((f) => f.userId).sort().join(','),
    [following]
  )

  useEffect(() => {
    if (!followingKey) {
      Promise.resolve().then(() => setItems([]))
      return
    }
    const byId = Object.fromEntries(following.map((f) => [f.userId, f]))

    // Demo mode — synthesize a feed for followed mock users.
    if (!canSync) {
      const now = Date.now()
      const mock = following.flatMap((f) =>
        (MOCK_FEED[f.userId] || []).map((m, i) => ({
          id: `${f.userId}-${i}`,
          userId: f.userId,
          displayName: f.displayName,
          avatarEmoji: f.avatarEmoji || '',
          username: f.username || '',
          title: m.title,
          creator: m.creator,
          type: m.type,
          status: m.status,
          rating: m.rating,
          coverUrl: '',
          at: new Date(now - m.hoursAgo * 3600000).toISOString(),
        }))
      ).sort((a, b) => new Date(b.at) - new Date(a.at))
      Promise.resolve().then(() => setItems(mock.slice(0, limit)))
      return
    }

    let cancelled = false
    Promise.resolve().then(() => setLoading(true))
    supabase
      .from('catalog_items')
      .select('id, user_id, title, creator, type, genre, year, status, rating, cover_url, date_added, date_consumed')
      .in('user_id', following.map((f) => f.userId))
      .order('date_added', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Friends feed failed:', error.message)
          setItems([])
        } else {
          setItems(
            (data || []).map((row) => {
              const friend = byId[row.user_id] || {}
              return {
                id: row.id,
                userId: row.user_id,
                displayName: friend.displayName || 'Someone',
                avatarEmoji: friend.avatarEmoji || '',
                username: friend.username || '',
                title: row.title,
                creator: row.creator || '',
                type: row.type,
                status: row.status || 'want',
                rating: row.rating || 0,
                genre: row.genre || '',
                year: row.year || '',
                coverUrl: row.cover_url || '',
                at: row.date_consumed || row.date_added,
              }
            })
          )
        }
        setLoading(false)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followingKey, canSync, limit])

  return { items, loading, hasFriends: following.length > 0 }
}
