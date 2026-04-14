import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

const DEFAULT_PUBLIC_PROFILE = {
  isPublic: false,
  username: '',
  bio: '',
}

export function usePublicProfile() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_PUBLIC_PROFILE)

  const storageKey = user ? `cc_public_${user.uid}` : null

  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved) setSettings(JSON.parse(saved))
  }, [storageKey])

  const save = (updated) => {
    setSettings(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const togglePublic = () => save({ ...settings, isPublic: !settings.isPublic })
  const setUsername = (username) => save({ ...settings, username })
  const setBio = (bio) => save({ ...settings, bio })

  return { ...settings, togglePublic, setUsername, setBio }
}
