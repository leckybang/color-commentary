import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

const DEFAULT_PROFILE = {
  music: { artists: [], genres: [], albums: [] },
  movies: { directors: [], actors: [], genres: [], films: [] },
  tv: { shows: [], genres: [], creators: [] },
  books: { authors: [], genres: [], books: [] },
}

export function useTasteProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [loading, setLoading] = useState(true)

  const storageKey = user ? `cc_taste_${user.uid}` : null

  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      setProfile(JSON.parse(saved))
    }
    setLoading(false)
  }, [storageKey])

  const saveProfile = (updated) => {
    setProfile(updated)
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(updated))
    }
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

  const getSpectrum = (key) => {
    return profile.spectrums?.[key] ?? 50
  }

  const setSpectrum = (key, value) => {
    const updated = {
      ...profile,
      spectrums: {
        ...(profile.spectrums || {}),
        [key]: value,
      },
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
