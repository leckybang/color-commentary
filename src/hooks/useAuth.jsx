import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

const DEMO_USER = {
  uid: 'demo-user',
  email: 'demo@colorcommentary.app',
  displayName: 'Demo User',
}

function mapSupabaseUser(supaUser) {
  if (!supaUser) return null
  // Check localStorage for onboardingComplete (more reliable than user_metadata)
  const localData = localStorage.getItem(`cc_user_meta_${supaUser.id}`)
  const localMeta = localData ? JSON.parse(localData) : {}

  return {
    uid: supaUser.id,
    email: supaUser.email,
    displayName: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'User',
    avatarUrl: supaUser.user_metadata?.avatar_url || '',
    onboardingComplete: localMeta.onboardingComplete || supaUser.user_metadata?.onboardingComplete || false,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const mapped = session ? mapSupabaseUser(session.user) : null
        setUser(mapped)
        setLoading(false)
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const mapped = session ? mapSupabaseUser(session.user) : null
        setUser(mapped)
        if (mapped) {
          // Also persist to localStorage so we have a fallback
          localStorage.setItem('cc_user', JSON.stringify(mapped))
        } else {
          localStorage.removeItem('cc_user')
        }
        setLoading(false)
      })
      return () => subscription.unsubscribe()
    } else {
      const saved = localStorage.getItem('cc_user')
      if (saved) {
        setUser(JSON.parse(saved))
      }
      setLoading(false)
    }
  }, [])

  const login = async (email, name) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithPassword({ email, password: email })
      if (error) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: email,
          options: { data: { full_name: name || email.split('@')[0] } },
        })
        if (signUpError) throw signUpError
      }
    } else {
      const u = { uid: `user-${Date.now()}`, email, displayName: name || email.split('@')[0] }
      localStorage.setItem('cc_user', JSON.stringify(u))
      setUser(u)
      return u
    }
  }

  const loginWithGoogle = async () => {
    if (!isSupabaseConfigured) return
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  const loginDemo = () => {
    localStorage.setItem('cc_user', JSON.stringify(DEMO_USER))
    setUser(DEMO_USER)
  }

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    localStorage.removeItem('cc_user')
    setUser(null)
  }

  const updateProfile = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('cc_user', JSON.stringify(updated))
    // Also persist specific flags to a user-scoped key for Supabase users
    if (user?.uid) {
      const metaKey = `cc_user_meta_${user.uid}`
      const existing = localStorage.getItem(metaKey)
      const meta = existing ? JSON.parse(existing) : {}
      localStorage.setItem(metaKey, JSON.stringify({ ...meta, ...updates }))
    }
    if (isSupabaseConfigured) {
      supabase.auth.updateUser({ data: updates }).catch(console.error)
    }
    setUser(updated)
  }

  const completeOnboarding = () => {
    updateProfile({ onboardingComplete: true })
  }

  const needsOnboarding = user && !user.onboardingComplete

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, loginDemo, logout, updateProfile, completeOnboarding, needsOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
