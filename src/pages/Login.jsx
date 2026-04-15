import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'
import { Music, Film, Tv, BookOpen, Sparkles, Radar, BookMarked, Star, Users } from 'lucide-react'

export default function Login() {
  const { login, loginDemo, loginWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState('welcome')
  const [authError, setAuthError] = useState(null)

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null)
      await loginWithGoogle()
    } catch (err) {
      setAuthError(err.message || 'Google sign-in failed')
      console.error('Google sign-in error:', err)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email) login(email, name)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #110d18 0%, #1a1228 50%, #0f0d16 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo & tagline */}
        <div className="text-center mb-8">
          <div className="flex justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-accent-music/20 flex items-center justify-center">
              <Music size={24} className="text-accent-music" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-movies/20 flex items-center justify-center">
              <Film size={24} className="text-accent-movies" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-tv/20 flex items-center justify-center">
              <Tv size={24} className="text-accent-tv" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-books/20 flex items-center justify-center">
              <BookOpen size={24} className="text-accent-books" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-music via-accent-movies to-accent-tv bg-clip-text text-transparent mb-2">
            Color Commentary
          </h1>
          <p className="text-text-secondary text-lg">
            Your media universe, organized.
          </p>
        </div>

        {/* Sign in card */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
          {mode === 'welcome' ? (
            <div className="space-y-4">
              {isSupabaseConfigured && (
                <>
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 font-medium py-3 px-4 rounded-xl transition-all hover:bg-gray-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Sign in with Google
                  </button>
                  {authError && (
                    <p className="text-xs text-red-400 text-center mt-2">{authError}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-text-muted">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </>
              )}

              <button
                onClick={loginDemo}
                className="w-full flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-hover text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                <Sparkles size={18} />
                Try Demo Mode
              </button>

              <button
                onClick={() => setMode('signup')}
                className="w-full bg-bg-tertiary hover:bg-bg-hover border border-border text-text-primary font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Create Account
              </button>

              <p className="text-xs text-text-muted text-center">
                Demo mode saves locally. Sign in with Google to sync across devices.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-accent-primary hover:bg-accent-hover text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Get Started
              </button>
              <button
                type="button"
                onClick={() => setMode('welcome')}
                className="w-full text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                Back
              </button>
            </form>
          )}
        </div>

        {/* App overview */}
        <div className="space-y-3">
          <p className="text-xs text-text-muted text-center uppercase tracking-widest mb-2">What you get</p>
          {[
            { icon: Radar, color: 'text-accent-primary', title: 'Weekly Radar', desc: 'Personalized new releases and discoveries, delivered like a Substack for your taste.' },
            { icon: BookMarked, color: 'text-accent-music', title: 'Liner Notes', desc: 'A weekly journal for what you\'re watching, reading, and listening to. Hot takes welcome.' },
            { icon: Star, color: 'text-amber-500', title: 'Catalog & Rate', desc: 'Track everything you consume. Rate it, review it, never forget what you thought.' },
            { icon: Users, color: 'text-accent-tv', title: 'Friends & Group Chat', desc: 'Find friends with taste. Start a group chat around a book, album, or movie.' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="flex items-start gap-3 bg-bg-secondary/50 border border-border/50 rounded-xl p-3">
              <Icon size={18} className={`${color} mt-0.5 shrink-0`} />
              <div>
                <p className="text-sm font-medium text-text-primary">{title}</p>
                <p className="text-xs text-text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
