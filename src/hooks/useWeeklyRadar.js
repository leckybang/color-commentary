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
  const abortRef = useRef(null)

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort()

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

    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)

    getWeeklyRadar(user, profile, items, {
      signal: controller.signal,
      forceRefresh: refreshKey > 0,
    })
      .then((result) => {
        if (controller.signal.aborted) return
        setRadar(result)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('useWeeklyRadar fetch failed', err)
        setError(err)
        setLoading(false)
      })

    return () => controller.abort()
    // `items` change (e.g. user adds something) shouldn't re-trigger an API
    // round-trip; we rely on the 30-min cache and manual refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isDemo, profileEmpty, refreshKey])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { radar, loading, error, refresh, isDemo: !!radar?.isDemo }
}
