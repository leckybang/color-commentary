import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

const MOCK_USERS = [
  { userId: 'mock-1', displayName: 'Alex Rivera', email: 'alex@example.com', archetype: 'The Genre Hopper' },
  { userId: 'mock-2', displayName: 'Sam Chen', email: 'sam@example.com', archetype: 'The Deep Diver' },
  { userId: 'mock-3', displayName: 'Jordan Blake', email: 'jordan@example.com', archetype: 'The Curator' },
  { userId: 'mock-4', displayName: 'Casey Moreno', email: 'casey@example.com', archetype: 'The Creature of Comforts' },
  { userId: 'mock-5', displayName: 'Riley Park', email: 'riley@example.com', archetype: 'The Tastemaker' },
]

export function useFriends() {
  const { user } = useAuth()
  const [data, setData] = useState({ following: [], followers: [] })

  const storageKey = user ? `cc_friends_${user.uid}` : null

  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved) setData(JSON.parse(saved))
  }, [storageKey])

  const save = (updated) => {
    setData(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const follow = (friendUser) => {
    if (data.following.some((f) => f.userId === friendUser.userId)) return
    save({
      ...data,
      following: [...data.following, { ...friendUser, followedAt: new Date().toISOString() }],
    })
  }

  const unfollow = (userId) => {
    save({ ...data, following: data.following.filter((f) => f.userId !== userId) })
  }

  const isFollowing = (userId) => data.following.some((f) => f.userId === userId)

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

  return {
    following: data.following,
    followers: data.followers,
    follow,
    unfollow,
    isFollowing,
    searchUsers,
    mockUsers: MOCK_USERS,
  }
}
