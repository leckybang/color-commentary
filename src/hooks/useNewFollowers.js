import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { useFriends } from './useFriends'

const SEEN_EVENT = 'cc-followers-seen'

/**
 * Tracks followers you haven't "seen" yet (never shown on the Friends page).
 * Powers the pink dot on the Friends nav item; the Friends page calls
 * markFollowersSeen() to clear it. Seen state lives in localStorage and a
 * window event keeps every subscriber (sidebar, page) in sync.
 */
export function useNewFollowers() {
  const { user } = useAuth()
  const { followers } = useFriends()
  const seenKey = user ? `cc_followers_seen_${user.uid}` : null
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

  let seen = new Set()
  if (seenKey) {
    try {
      seen = new Set(JSON.parse(localStorage.getItem(seenKey) || '[]'))
    } catch {
      /* treat unparseable as nothing seen */
    }
  }
  const newFollowerCount = followers.filter((f) => !seen.has(f.userId)).length

  const markFollowersSeen = useCallback(() => {
    if (!seenKey) return
    localStorage.setItem(seenKey, JSON.stringify(followers.map((f) => f.userId)))
    window.dispatchEvent(new Event(SEEN_EVENT))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenKey, followers.map((f) => f.userId).sort().join(',')])

  return { newFollowerCount, markFollowersSeen }
}
