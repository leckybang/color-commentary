import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'
import { Play, Radar, BookMarked, Star, Users } from 'lucide-react'

const FEATURES = [
  {
    icon: Radar,
    color: 'var(--color-accent-movies)',
    title: 'Weekly Radar',
    desc: "See each week's hyped releases and critics' darlings.",
  },
  {
    icon: BookMarked,
    color: 'var(--color-accent-music)',
    title: 'Quick Add',
    desc: 'Log what you’re listening to, watching, and reading in one tap.',
  },
  {
    icon: Star,
    color: '#f0b429',
    title: 'Catalog & Rate',
    desc: 'Track everything you consume. Rate it, review it, never forget what you thought.',
  },
  {
    icon: Users,
    color: 'var(--color-accent-tv)',
    title: 'Friends & Profiles',
    desc: 'Follow friends with taste and snoop each other’s public profiles.',
  },
]

export default function Login() {
  const { login, loginDemo, loginWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState('welcome')
  const [authError, setAuthError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null)
      await loginWithGoogle()
    } catch (err) {
      setAuthError(err.message || 'Google sign-in failed')
      console.error('Google sign-in error:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || submitting) return
    setSubmitting(true)
    setAuthError(null)
    setNotice(null)
    try {
      const result = await login(email, name)
      if (result === 'confirm-email') {
        setNotice('Almost there! Check your inbox for a confirmation email, then come back and hit Get Started again.')
      }
      // 'signed-in' / 'signed-up' redirect via the auth listener.
    } catch (err) {
      console.error('Sign-up failed:', err)
      setAuthError(err.message || 'Could not create the account. Try Google sign-in instead.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-bg-primary text-text-primary">
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <div className="flex flex-col items-center text-center mb-8">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[3px] text-text-muted mb-4">
            <span className="w-5 h-[3px] rounded-full bg-accent-primary inline-block" aria-hidden="true" />
            track · rate · share
            <span className="w-5 h-[3px] rounded-full bg-accent-primary inline-block" aria-hidden="true" />
          </p>
          <div className="flex items-center gap-3.5 mb-4">
            <div className="grid grid-cols-2 gap-1 w-11 h-11 shrink-0" aria-hidden="true">
              <span className="rounded-[10px_10px_10px_3px] bg-accent-music" />
              <span className="rounded-[10px_10px_10px_3px] bg-accent-movies" />
              <span className="rounded-[10px_10px_10px_3px] bg-accent-tv" />
              <span className="rounded-[10px_10px_10px_3px] bg-accent-books" />
            </div>
            <h1
              className="text-[34px] font-extrabold leading-[0.95] text-left"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-1px' }}
            >
              color
              <br />
              <span className="relative inline-block">
                commentary
                <span className="absolute left-0 right-0 -bottom-1 h-[4px] rounded-full bg-accent-primary" aria-hidden="true" />
              </span>
            </h1>
          </div>
          <p className="text-text-secondary text-base max-w-xs">
            Track every book, movie, show, and album in one place, and stay on top of new releases.
          </p>
        </div>

        {/* Sign in card */}
        <div className="ink-card bg-bg-secondary rounded-2xl p-6 mb-8">
          {mode === 'welcome' ? (
            <div className="space-y-3.5">
              {isSupabaseConfigured && (
                <>
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-2.5 bg-white text-gray-800 font-semibold py-3 px-4 rounded-full border-[1.5px] border-text-primary transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Sign in with Google
                  </button>
                  {authError && (
                    <p className="text-xs text-accent-movies text-center">{authError}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t border-dotted border-border" />
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-text-muted">or</span>
                    <div className="flex-1 border-t border-dotted border-border" />
                  </div>
                </>
              )}

              <button
                onClick={loginDemo}
                className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-full transition-all hover:opacity-90 active:scale-[0.99]"
                style={{
                  backgroundColor: 'var(--color-nav-bg)',
                  color: 'var(--color-nav-text)',
                  boxShadow: '3px 3px 0 var(--color-accent-primary)',
                }}
              >
                <Play size={17} />
                Try Demo Mode
              </button>

              <button
                onClick={() => setMode('signup')}
                className="w-full font-semibold py-3 px-4 rounded-full border-[1.5px] border-text-primary text-text-primary hover:bg-bg-hover transition-colors"
              >
                Create Account
              </button>

              <p className="text-xs text-text-muted text-center pt-1">
                Demo mode saves locally. Sign in with Google to sync across devices.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
                />
              </div>
              {authError && (
                <p className="text-xs text-accent-movies text-center">{authError}</p>
              )}
              {notice && (
                <p className="text-xs font-semibold text-accent-books text-center">{notice}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full font-bold py-3 px-4 rounded-full transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--color-nav-bg)',
                  color: 'var(--color-nav-text)',
                  boxShadow: '3px 3px 0 var(--color-accent-primary)',
                }}
              >
                {submitting ? 'Creating your account…' : 'Get Started'}
              </button>
              <button
                type="button"
                onClick={() => setMode('welcome')}
                className="w-full text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                ← Back
              </button>
            </form>
          )}
        </div>

        {/* What you get — pastel tiles with corner ticks */}
        <p className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[3px] text-text-muted mb-3">
          what you get
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((feat) => {
            const { color, title, desc } = feat
            const Icon = feat.icon
            return (
              <div
                key={title}
                className="ink-tile relative overflow-hidden rounded-2xl p-4"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, var(--color-bg-secondary))` }}
              >
                <span
                  className="absolute top-0 right-0 w-7 h-7 rounded-bl-2xl"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <Icon size={17} style={{ color }} className="mb-2" />
                <p
                  className="text-sm font-bold text-text-primary mb-0.5"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {title}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
              </div>
            )
          })}
        </div>

        <p className="text-center text-[11px] text-text-muted mt-8">
          color-commentary.netlify.app
        </p>
      </div>
    </div>
  )
}
