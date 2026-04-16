import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Fetches a PUBLIC profile by username (for /u/:username lookups).
 * Returns null if not found, not public, or Supabase not configured.
 */
export function usePublicProfileByUsername(username) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!username) {
      setLoading(false)
      return
    }
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    supabase
      .from('profiles')
      .select('id, display_name, username, bio, is_public, avatar_emoji, avatar_url, email')
      .ilike('username', username)
      .eq('is_public', true)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        setProfile(data)
        setLoading(false)
      })
  }, [username])

  return { profile, loading, error }
}
