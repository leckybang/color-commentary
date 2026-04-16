import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase, shouldSync } from '../lib/syncToSupabase'

const MOCK_USERS = [
  { userId: 'mock-1', displayName: 'Alex Rivera', email: 'alex@example.com', archetype: 'The Feral Librarian' },
  { userId: 'mock-2', displayName: 'Sam Chen', email: 'sam@example.com', archetype: 'The Completionist' },
  { userId: 'mock-3', displayName: 'Jordan Blake', email: 'jordan@example.com', archetype: 'The Gatekeeper' },
  { userId: 'mock-4', displayName: 'Casey Moreno', email: 'casey@example.com', archetype: 'The Cozy Rewatcher' },
  { userId: 'mock-5', displayName: 'Riley Park', email: 'riley@example.com', archetype: 'The Tastemaker-at-Large' },
]

/**
 * Friends — syncs follows to Supabase 'follows' table. Also exposes an async
 * user search via profiles.is_public.
 */
export function useFriends() {
  const { user } = useAuth()
  const [data, setData] = useState({ following: [], followers: [] })

  const storageKey = user ? `cc_friends_${user.uid}` : null
  const canSync = shouldSync(user)

  useEffect(() => {
    if (!storageKey) return

    const saved = localStorage.getItem(storageKey)
    if (saved) setData(JSON.parse(saved))

    if (canSync) {
      // Fetch following
      Promise.all([
        supabase
          .from('follows')
          .select('following_id, created_at')
          .eq('follower_id', user.uid),
        supabase
          .from('follows')
          .select('follower_id, created_at')
          .eq('following_id', user.uid),
      ]).then(async ([followingRes, followersRes]) => {
        const followingIds = (followingRes.data || []).map((r) => r.following_id)
        const followerIds = (followersRes.data || []).map((r) => r.follower_id)
        const allIds = [...new Set([...followingIds, ...followerIds])]

        let profileMap = {}
        if (allIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, username, avatar_emoji, archetype')
            .in('id', allIds)
          profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
        }

        const following = (followingRes.data || []).map((r) => {
          const p = profileMap[r.following_id] || {}
          return {
            userId: r.following_id,
            displayName: p.display_name || 'User',
            username: p.username || '',
            avatarEmoji: p.avatar_emoji || '',
            archetype: p.archetype || '',
            followedAt: r.created_at,
          }
        })

        const followers = (followersRes.data || []).map((r) => {
          const p = profileMap[r.follower_id] || {}
          return {
            userId: r.follower_id,
            displayName: p.display_name || 'User',
            username: p.username || '',
            avatarEmoji: p.avatar_emoji || '',
            archetype: p.archetype || '',
            followedAt: r.created_at,
          }
        })

        const updated = { following, followers }
        setData(updated)
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
      }).catch((err) => console.error('Friends fetch failed:', err))
    }
  }, [storageKey, canSync, user?.uid])

  const saveLocal = (updated) => {
    setData(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const follow = (friendUser) => {
    if (data.following.some((f) => f.userId === friendUser.userId)) return
    const updated = {
      ...data,
      following: [...data.following, { ...friendUser, followedAt: new Date().toISOString() }],
    }
    saveLocal(updated)

    if (canSync && !friendUser.userId.startsWith('mock-')) {
      supabase
        .from('follows')
        .insert({ follower_id: user.uid, following_id: friendUser.userId })
        .then(({ error }) => {
          if (error) console.error('Follow failed:', error.message)
        })
    }
  }

  const unfollow = (userId) => {
    saveLocal({ ...data, following: data.following.filter((f) => f.userId !== userId) })

    if (canSync && !userId.startsWith('mock-')) {
      supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.uid)
        .eq('following_id', userId)
        .then(({ error }) => {
          if (error) console.error('Unfollow failed:', error.message)
        })
    }
  }

  const isFollowing = (userId) => data.following.some((f) => f.userId === userId)

  // Synchronous search — only mock users (used as fallback)
  const searchUsers = (query) => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return MOCK_USERS.filter(
      (u) =>
        u.userId !== user?.uid &&
        !data.following.some((f) => f.userId === u.userId) &&
        (u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    )
  }

  // Async search across public Supabase profiles (for real users)
  const searchUsersAsync = async (query) => {
    if (!query.trim()) return []
    if (!canSync) return searchUsers(query) // Demo mode: return mocks

    const q = query.trim()
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_emoji, archetype, email')
      .eq('is_public', true)
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq('id', user.uid)
      .limit(10)

    if (error) {
      console.error('User search failed:', error.message)
      return []
    }

    const followingIds = new Set(data.following.map((f) => f.userId))

    return (profiles || [])
      .filter((p) => !followingIds.has(p.id))
      .map((p) => ({
        userId: p.id,
        displayName: p.display_name || 'User',
        username: p.username || '',
        email: p.email || '',
        avatarEmoji: p.avatar_emoji || '',
        archetype: p.archetype || '',
      }))
  }

  return {
    following: data.following,
    followers: data.followers,
    follow,
    unfollow,
    isFollowing,
    searchUsers,
    searchUsersAsync,
    mockUsers: MOCK_USERS,
  }
}
