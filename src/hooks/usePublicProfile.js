import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const DEFAULT_PUBLIC_PROFILE = {
  isPublic: false,
  username: '',
  bio: '',
  avatarEmoji: '',
  emailRadar: false,
}

export function usePublicProfile() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_PUBLIC_PROFILE)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(0)

  const storageKey = user ? `cc_public_${user.uid}` : null

  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved) setSettings({ ...DEFAULT_PUBLIC_PROFILE, ...JSON.parse(saved) })

    // Also hydrate from Supabase if configured. Use maybeSingle so a missing
    // row doesn't throw — ensureProfile in useAuth will (re)create it.
    if (isSupabaseConfigured && user?.uid && !user.uid.startsWith('demo') && !user.uid.startsWith('user-')) {
      supabase
        .from('profiles')
        .select('username, bio, is_public, avatar_emoji, email_radar')
        .eq('id', user.uid)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const merged = {
              username: data.username || '',
              bio: data.bio || '',
              isPublic: !!data.is_public,
              avatarEmoji: data.avatar_emoji || '',
              emailRadar: !!data.email_radar,
            }
            setSettings(merged)
            if (storageKey) localStorage.setItem(storageKey, JSON.stringify(merged))
          }
        })
    }
  }, [storageKey, user?.uid])

  const persist = async (updated) => {
    setSettings(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))

    // Sync to Supabase (fire and forget). Use UPSERT so the row is created if
    // it's missing (e.g. profile trigger never fired) — `update` would silently
    // affect zero rows and the change would never make it across devices.
    if (isSupabaseConfigured && user?.uid && !user.uid.startsWith('demo') && !user.uid.startsWith('user-')) {
      setSaving(true)
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.uid,
            display_name: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email || null,
            username: updated.username || null,
            bio: updated.bio || '',
            is_public: updated.isPublic,
            avatar_emoji: updated.avatarEmoji || null,
            email_radar: updated.emailRadar || false,
          }, { onConflict: 'id' })
        if (error) console.error('Profile sync error:', error.message)
        setLastSaved(Date.now())
      } finally {
        setSaving(false)
      }
    } else {
      setLastSaved(Date.now())
    }
  }

  const togglePublic = () => persist({ ...settings, isPublic: !settings.isPublic })
  const setUsername = (username) => persist({ ...settings, username })
  const setBio = (bio) => persist({ ...settings, bio })
  const setAvatarEmoji = (avatarEmoji) => persist({ ...settings, avatarEmoji })
  const toggleEmailRadar = () => persist({ ...settings, emailRadar: !settings.emailRadar })
  const savePublicProfile = (overrides) => persist({ ...settings, ...overrides })

  return {
    ...settings,
    saving,
    lastSaved,
    togglePublic,
    setUsername,
    setBio,
    setAvatarEmoji,
    toggleEmailRadar,
    savePublicProfile,
  }
}
