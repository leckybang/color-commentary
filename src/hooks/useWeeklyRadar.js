/**
 * useWeeklyRadar — React hook wrapping the demo-aware radar service.
 *
 * Radar is now generic (same picks for everyone — no personalization gate).
 * Demo users resolve synchronously; real users get a cached fetch.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { getWeeklyRadar, getDemoRadar } from '../services/radar'

export function useWeeklyRadar() {
  const { user, isDemo } = useAuth()

  const [radar, setRadar] = useState(() => (isDemo ? getDemoRadar() : null))
  const [loading, setLoading] = useState(!isDemo && !!user)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // `staleRef` lets the effect ignore results from a superseded render without
  // aborting the underlying network requests.
  const staleRef = useRef({ id: 0 })

  useEffect(() => {
    // Demo path: resolve in a microtask so setState doesn't fire sync in the
    // effect (which the react-hooks/purity rule flags as cascading-render).
    if (isDemo || !user) {
      Promise.resolve().then(() => {
        setRadar(getDemoRadar())
        setLoading(false)
        setError(null)
      })
      return
    }

    const runId = staleRef.current.id + 1
    staleRef.current.id = runId
    Promise.resolve().then(() => {
      setLoading(true)
      setError(null)
    })

    getWeeklyRadar(user, null, [], { forceRefresh: refreshKey > 0 })
      .then((result) => {
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
  }, [user?.uid, isDemo, refreshKey, user])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { radar, loading, error, refresh, isDemo: !!radar?.isDemo }
}
