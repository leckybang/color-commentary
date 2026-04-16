import { useState, useEffect, useRef } from 'react'
import { searchMedia } from '../services/mediaSearch'

/**
 * Debounced media search hook with request cancellation.
 * @param {string} query
 * @param {string[]} preferredTypes
 * @param {number} debounceMs
 * @returns {{ results, loading, error }}
 */
export function useMediaSearch(query, preferredTypes, debounceMs = 300) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    const trimmed = query.trim()

    // Clear state if query too short
    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    // Debounce
    const timer = setTimeout(async () => {
      // Cancel in-flight request
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setError(null)
      try {
        const found = await searchMedia(trimmed, preferredTypes, { signal: controller.signal })
        // Only commit if still relevant
        if (!controller.signal.aborted) {
          setResults(found)
          setLoading(false)
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Search failed')
          setLoading(false)
        }
      }
    }, debounceMs)

    return () => {
      clearTimeout(timer)
    }
  }, [query, preferredTypes?.join(','), debounceMs])

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  return { results, loading, error }
}
