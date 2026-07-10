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

// ─── Shared store ───
// Every usePublicProfile() call (Sidebar, Settings, Profile tab, …) reads the
// SAME state. Before this, each component held its own copy: picking an emoji
// in Settings didn't update the Sidebar, and a slow Supabase hydrate could
// land AFTER a fresh edit and silently revert it — which is why saves looked
// like they never stuck.
let sharedSettings = DEFAULT_PUBLIC_PROFILE
let sharedSaving = false
let hydratedKey = null // storageKey we've already hydrated for
let dirtyAt = 0 // timestamp of the last local edit — guards the hydrate race
const listeners = new Set()

function emit() {
  listeners.forEach((l) => l())
}

function setShared(settings) {
  sharedSettings = settings
  emit()
}

function isRealUser(user) {
  return isSupabaseConfigured && user?.uid && !user.uid.startsWith('demo') && !user.uid.startsWith('user-')
}

export function usePublicProfile() {
  const { user } = useAuth()
  const [, forceRender] = useState(0)

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1)
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])

  const storageKey = user ? `cc_public_${user.uid}` : null

  useEffect(() => {
    if (!storageKey || hydratedKey === storageKey) return
    hydratedKey = storageKey
    dirtyAt = 0
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setShared({ ...DEFAULT_PUBLIC_PROFILE, ...JSON.parse(saved) })
      } catch {
        /* corrupt localStorage — fall through to defaults/Supabase */
      }
    } else {
      setShared(DEFAULT_PUBLIC_PROFILE)
    }

    // Also hydrate from Supabase if configured. Use maybeSingle so a missing
    // row doesn't throw — ensureProfile in useAuth will (re)create it.
    if (isRealUser(user)) {
      supabase
        .from('profiles')
        .select('username, bio, is_public, avatar_emoji, email_radar')
        .eq('id', user.uid)
        .maybeSingle()
        .then(({ data }) => {
          // If the user edited anything while this request was in flight,
          // their edit wins — do not clobber it with stale server data.
          if (!data || dirtyAt > 0) return
          const merged = {
            username: data.username || '',
            bio: data.bio || '',
            isPublic: !!data.is_public,
            avatarEmoji: data.avatar_emoji || '',
            emailRadar: !!data.email_radar,
          }
          setShared(merged)
          localStorage.setItem(storageKey, JSON.stringify(merged))
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, user?.uid])

  const persist = async (updated) => {
    dirtyAt = Date.now()
    setShared(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))

    // Sync to Supabase. Use UPSERT so the row is created if it's missing
    // (e.g. profile trigger never fired) — `update` would silently affect
    // zero rows and the change would never make it across devices.
    if (isRealUser(user)) {
      sharedSaving = true
      emit()
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
      } finally {
        sharedSaving = false
        emit()
      }
    }
  }

  const togglePublic = () => persist({ ...sharedSettings, isPublic: !sharedSettings.isPublic })
  const setUsername = (username) => persist({ ...sharedSettings, username })
  const setBio = (bio) => persist({ ...sharedSettings, bio })
  const setAvatarEmoji = (avatarEmoji) => persist({ ...sharedSettings, avatarEmoji })
  const toggleEmailRadar = () => persist({ ...sharedSettings, emailRadar: !sharedSettings.emailRadar })
  const savePublicProfile = (overrides) => persist({ ...sharedSettings, ...overrides })

  return {
    ...sharedSettings,
    saving: sharedSaving,
    togglePublic,
    setUsername,
    setBio,
    setAvatarEmoji,
    toggleEmailRadar,
    savePublicProfile,
  }
}
