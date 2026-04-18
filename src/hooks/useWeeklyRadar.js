import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getWeeklyRadar, clearRadarCache } from '../services/radar'

const EMPTY_RADAR = { newReleases: [], discoveries: [], source: 'live', generatedAt: null }

/**
 * Loads the weekly radar for the current user. Demo users resolve synchronously
 * from mockData; real users hit live APIs (Spotify, TMDB, OpenLibrary).
 */
export function useWeeklyRadar(profile, catalogItems, { skip = false } = {}) {
  const { user } = useAuth()
  const [radar, setRadar] = useState(EMPTY_RADAR)
  const [internalLoading, setInternalLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshCount, setRefreshCount] = useState(0)
  const abortRef = useRef(null)

  const enabled = !!user && !skip

  useEffect(() => {
    if (!enabled) return
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading on dep change before async fetch
    setInternalLoading(true)
    setError(null)

    getWeeklyRadar(user, profile, catalogItems, {
      signal: controller.signal,
      force: refreshCount > 0,
    })
      .then((data) => {
        if (cancelled) return
        setRadar(data)
        setInternalLoading(false)
      })
      .catch((err) => {
        if (cancelled || err.name === 'AbortError') return
        console.error('useWeeklyRadar failed', err)
        setError(err)
        setInternalLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [enabled, user, profile, catalogItems, refreshCount])

  const refresh = useCallback(() => {
    clearRadarCache()
    setRefreshCount((n) => n + 1)
  }, [])

  // When skipped or unauthenticated, loading is implicitly false — no fetch happens.
  const loading = enabled ? internalLoading : false

  return { radar, loading, error, refresh }
}
