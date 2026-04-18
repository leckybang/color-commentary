/**
 * useWeeklyRadar — React hook wrapping the demo-aware radar service.
 *
 * For demo users, resolves synchronously on first render with the parody
 * payload. For real users, fetches live API data (Spotify/TMDB/OpenLibrary),
 * cached per-user/per-week for 30 min. Returns { radar, loading, error,
 * refresh }.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { useTasteProfile } from './useTasteProfile'
import { useCatalog } from './useCatalog'
import { getWeeklyRadar, getDemoRadar } from '../services/radar'

export function useWeeklyRadar() {
  const { user, isDemo } = useAuth()
  const { profile, isProfileEmpty } = useTasteProfile()
  const { items } = useCatalog()

  const [radar, setRadar] = useState(() => (isDemo ? getDemoRadar(profile, items) : null))
  const [loading, setLoading] = useState(!isDemo && !!user && !isProfileEmpty())
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const profileEmpty = isProfileEmpty()
  // `staleRef` lets the effect ignore results from a superseded render without
  // aborting the underlying network requests. Aborting the fetches caused
  // empty radar payloads to get written to the cache whenever the hook
  // re-fired during auth/profile hydration.
  const staleRef = useRef({ id: 0 })

  useEffect(() => {
    // No profile — nothing to render.
    if (profileEmpty) {
      setRadar(null)
      setLoading(false)
      setError(null)
      return
    }

    // Demo path: resolve synchronously, no fetch.
    if (isDemo || !user) {
      setRadar(getDemoRadar(profile, items))
      setLoading(false)
      setError(null)
      return
    }

    const runId = staleRef.current.id + 1
    staleRef.current.id = runId
    setLoading(true)
    setError(null)

    getWeeklyRadar(user, profile, items, {
      forceRefresh: refreshKey > 0,
    })
      .then((result) => {
        // Only apply results if this is still the most recent run; otherwise
        // the fetch was for a prior render that's been superseded.
        if (staleRef.current.id !== runId) return
        setRadar(result)
        setLoading(false)
      })
      .catch((err) => {
        if (staleRef.current.id !== runId) return
        console.error('useWeeklyRadar fetch failed', err)
        setError(err)
        setLoading(false)
      })
    // `items` change (e.g. user adds something) shouldn't re-trigger an API
    // round-trip; we rely on the 30-min cache and manual refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isDemo, profileEmpty, refreshKey])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { radar, loading, error, refresh, isDemo: !!radar?.isDemo }
}
