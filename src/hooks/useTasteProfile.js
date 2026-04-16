import { useState, useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase, shouldSync } from '../lib/syncToSupabase'

const DEFAULT_PROFILE = {
  music: { artists: [], genres: [], albums: [] },
  movies: { directors: [], actors: [], genres: [], films: [] },
  tv: { shows: [], genres: [], creators: [] },
  books: { authors: [], genres: [], books: [] },
}

/**
 * Taste profile — syncs to Supabase's taste_profiles table (whole profile as a JSONB blob).
 * Conflict resolution: last-write-wins. Writes are debounced so rapid edits don't spam the network.
 */
export function useTasteProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [loading, setLoading] = useState(true)
  const syncTimerRef = useRef(null)

  const storageKey = user ? `cc_taste_${user.uid}` : null
  const canSync = shouldSync(user)

  useEffect(() => {
    if (!storageKey) return

    const saved = localStorage.getItem(storageKey)
    if (saved) setProfile(JSON.parse(saved))
    setLoading(false)

    if (canSync) {
      supabase
        .from('taste_profiles')
        .select('profile_data')
        .eq('user_id', user.uid)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('Taste profile fetch failed:', error.message)
            return
          }
          if (data?.profile_data) {
            setProfile(data.profile_data)
            if (storageKey) localStorage.setItem(storageKey, JSON.stringify(data.profile_data))
          }
        })
    }
  }, [storageKey, canSync, user?.uid])

  // Debounced Supabase sync
  const scheduleSync = (updated) => {
    if (!canSync) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      supabase
        .from('taste_profiles')
        .upsert({
          user_id: user.uid,
          profile_data: updated,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (error) console.error('Taste profile sync failed:', error.message)
        })
    }, 800)
  }

  const saveProfile = (updated) => {
    setProfile(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
    scheduleSync(updated)
  }

  const updateCategory = (category, field, values) => {
    const updated = {
      ...profile,
      [category]: {
        ...profile[category],
        [field]: values,
      },
    }
    saveProfile(updated)
  }

  const addTag = (category, field, value) => {
    const current = profile[category][field] || []
    if (!current.includes(value)) {
      updateCategory(category, field, [...current, value])
    }
  }

  const removeTag = (category, field, value) => {
    const current = profile[category][field] || []
    updateCategory(category, field, current.filter((v) => v !== value))
  }

  const getAllArtists = () => {
    return [
      ...profile.music.artists,
      ...profile.movies.directors,
      ...profile.movies.actors,
      ...profile.tv.creators,
      ...profile.books.authors,
    ]
  }

  const getAllGenres = () => {
    return [
      ...new Set([
        ...profile.music.genres,
        ...profile.movies.genres,
        ...profile.tv.genres,
        ...profile.books.genres,
      ]),
    ]
  }

  const isProfileEmpty = () => {
    const cats = ['music', 'movies', 'tv', 'books']
    return cats.every((cat) => {
      const c = profile[cat]
      if (!c) return true
      return Object.values(c).every((v) => Array.isArray(v) ? v.length === 0 : true)
    })
  }

  const getSpectrum = (key) => profile.spectrums?.[key] ?? 50

  const setSpectrum = (key, value) => {
    const updated = {
      ...profile,
      spectrums: { ...(profile.spectrums || {}), [key]: value },
    }
    saveProfile(updated)
  }

  return {
    profile,
    loading,
    saveProfile,
    updateCategory,
    addTag,
    removeTag,
    getAllArtists,
    getAllGenres,
    isProfileEmpty,
    getSpectrum,
    setSpectrum,
  }
}
