import { useParams, Link } from 'react-router-dom'
import { Music, Film, Tv, BookOpen, Lock, Globe, Settings, Star, UserPlus, Headphones, Eye, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { usePublicProfileByUsername } from '../hooks/usePublicProfileByUsername'
import { useHeavyRotation } from '../hooks/useHeavyRotation'
import { useCatalog } from '../hooks/useCatalog'
import { useWeeklyDumps } from '../hooks/useWeeklyDumps'
import { determineArchetype } from '../utils/archetypes'
import CoverArt from '../components/common/CoverArt'
import SpectrumSlider from '../components/common/SpectrumSlider'
import { isSupabaseConfigured } from '../lib/supabase'

const RIGHT_NOW_SECTIONS = [
  { key: 'listening', label: 'Listening to', icon: Headphones, color: 'var(--color-accent-music)' },
  { key: 'watching',  label: 'Watching',     icon: Eye,        color: 'var(--color-accent-movies)' },
  { key: 'reading',   label: 'Reading',      icon: BookOpen,   color: 'var(--color-accent-books)' },
  { key: 'discovered',label: 'Discovered',   icon: Sparkles,   color: 'var(--color-accent-primary)' },
]

const SPECTRUMS = [
  { key: 'mainstream-obscure', leftLabel: 'Mainstream', rightLabel: 'Obscure' },
  { key: 'comfort-challenge', leftLabel: 'Comfort', rightLabel: 'Challenge' },
]

export default function PublicProfile({ isSelf }) {
  const { username } = useParams()
  const { user } = useAuth()
  const { profile } = useTasteProfile()
  const myProfile = usePublicProfile()
  const { itemIds } = useHeavyRotation()
  const { items, getStats } = useCatalog()
  const { getCurrentWeekDump } = useWeeklyDumps()

  // Fetch a Supabase profile when viewing someone else's slug
  const isViewingBySlug = !isSelf && !!username
  const { profile: otherProfile, loading: otherLoading } = usePublicProfileByUsername(
    isViewingBySlug ? username : null
  )

  const isOwnProfile = isSelf || (myProfile.username && myProfile.username.toLowerCase() === (username || '').toLowerCase())

  // Resolve which profile to display
  let displayProfile
  if (isOwnProfile) {
    displayProfile = {
      displayName: user?.displayName,
      avatarEmoji: myProfile.avatarEmoji,
      bio: myProfile.bio,
      username: myProfile.username,
      isPublic: myProfile.isPublic,
    }
  } else if (otherProfile) {
    displayProfile = {
      displayName: otherProfile.display_name,
      avatarEmoji: otherProfile.avatar_emoji,
      bio: otherProfile.bio,
      username: otherProfile.username,
      isPublic: otherProfile.is_public,
    }
  }

  // Loading state when viewing by slug
  if (isViewingBySlug && otherLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not found or not public
  if (isViewingBySlug && !otherProfile) {
    const supabaseNote = !isSupabaseConfigured
      ? "Public profiles require Supabase to work across devices. In demo mode, you can only view your own."
      : "Either this person doesn't exist yet, or they've kept their profile private."
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-center max-w-md">
          <Lock size={48} className="mx-auto text-text-muted/30 mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">Nothing to see here</h1>
          <p className="text-text-secondary text-sm">{supabaseNote}</p>
        </div>
      </div>
    )
  }

  if (!displayProfile) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">Profile not found.</p>
      </div>
    )
  }

  // When viewing someone else's profile, we can't show their Heavy Rotation/Taste DNA
  // without fetching that data too. For now, only show full data for own profile.
  const showFullData = isOwnProfile
  const archetype = showFullData ? determineArchetype(profile) : null
  const rotationItems = showFullData ? itemIds.map((id) => items.find((i) => i.id === id)).filter(Boolean) : []
  const stats = showFullData ? getStats() : null
  const currentDump = showFullData ? getCurrentWeekDump() : null
  const rightNowHasAny =
    !!currentDump &&
    RIGHT_NOW_SECTIONS.some(({ key }) => Array.isArray(currentDump[key]) && currentDump[key].length > 0)

  const showSelfWrapper = !isSelf // wrap in its own layout if /u/:username; /me uses app Layout
  const content = (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        {displayProfile.avatarEmoji ? (
          <div className="w-24 h-24 rounded-full bg-bg-tertiary border-2 border-border flex items-center justify-center text-5xl mx-auto mb-4">
            {displayProfile.avatarEmoji}
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary text-4xl font-bold mx-auto mb-4">
            {displayProfile.displayName?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <h1 className="text-2xl font-bold text-text-primary">{displayProfile.displayName}</h1>
        {displayProfile.username && (
          <p className="text-sm text-text-muted">@{displayProfile.username}</p>
        )}
        {archetype && (
          <>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-xl">{archetype.emoji}</span>
              <span className="text-text-secondary font-medium">{archetype.name}</span>
            </div>
            <p className="text-sm text-text-muted mt-1 italic max-w-md mx-auto">{archetype.description}</p>
          </>
        )}
        {displayProfile.bio && (
          <p className="text-sm text-text-secondary mt-3 max-w-md mx-auto">{displayProfile.bio}</p>
        )}

        {isOwnProfile && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <Link to="/me?tab=taste" className="text-xs text-accent-primary hover:underline flex items-center gap-1">
              <Settings size={12} /> Edit Taste Calibrator
            </Link>
          </div>
        )}
      </div>

      {showFullData && stats && (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Cataloged', value: stats.total },
              { label: 'Avg Rating', value: stats.avgRating || '—' },
              { label: 'Finished', value: stats.byStatus.finished },
            ].map((s) => (
              <div key={s.label} className="bg-bg-secondary border border-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-text-primary">{s.value}</p>
                <p className="text-xs text-text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Current Favorites */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-text-primary text-center mb-1">Current Favorites</h2>
            <p className="text-xs text-text-muted text-center mb-5">What I'm endorsing this week</p>
            {rotationItems.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {rotationItems.map((item) => (
                  <div key={item.id} className="text-center">
                    <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="lg" className="mx-auto" />
                    <p className="text-xs font-medium text-text-primary mt-2 truncate">{item.title}</p>
                    <p className="text-xs text-text-muted truncate">{item.creator}</p>
                    {item.rating > 0 && (
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        <Star size={10} fill="#f59e0b" stroke="#f59e0b" />
                        <span className="text-xs text-amber-500">{item.rating}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-text-muted">
                <p className="text-sm">Nothing in rotation yet.</p>
                {isOwnProfile && (
                  <Link to="/me?tab=taste" className="text-xs text-accent-primary hover:underline mt-1 inline-block">
                    Set up your Current Favorites in the Calibrator
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right Now — current week's Liner Notes */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-text-primary">Right Now</h2>
              {isOwnProfile && (
                <Link to="/" className="text-xs text-accent-primary hover:underline">Update on Dashboard</Link>
              )}
            </div>
            <p className="text-xs text-text-muted mb-4">What I'm into this week</p>
            {rightNowHasAny ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {RIGHT_NOW_SECTIONS.map(({ key, label, icon: Icon, color }) => {
                  const items = currentDump[key] || []
                  if (items.length === 0) return null
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon size={13} style={{ color }} />
                        <span className="text-xs font-medium text-text-muted">{label}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((tag, i) => {
                          const title = typeof tag === 'string' ? tag : (tag?.title || '')
                          const k = typeof tag === 'string' ? `${tag}-${i}` : (tag?.externalId || `${title}-${i}`)
                          return (
                            <span
                              key={k}
                              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
                              style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                            >
                              {tag?.coverUrl && (
                                <img src={tag.coverUrl} alt="" className="w-4 h-4 rounded object-cover" loading="lazy" referrerPolicy="no-referrer" />
                              )}
                              {title}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-text-muted">
                <p className="text-sm">Nothing logged this week yet.</p>
                {isOwnProfile && (
                  <Link to="/" className="text-xs text-accent-primary hover:underline mt-1 inline-block">
                    Add what you're into on the Dashboard
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Taste DNA */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Taste DNA</h2>
            <div className="space-y-6">
              {SPECTRUMS.map((spectrum) => (
                <SpectrumSlider
                  key={spectrum.key}
                  leftLabel={spectrum.leftLabel}
                  rightLabel={spectrum.rightLabel}
                  value={profile.spectrums?.[spectrum.key] ?? 50}
                  onChange={() => {}}
                  readonly
                  color="var(--color-accent-primary)"
                />
              ))}
            </div>
          </div>

          {/* Genre map */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Genre Map</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'music', label: 'Music', icon: Music, color: 'var(--color-accent-music)' },
                { key: 'movies', label: 'Movies', icon: Film, color: 'var(--color-accent-movies)' },
                { key: 'tv', label: 'TV', icon: Tv, color: 'var(--color-accent-tv)' },
                { key: 'books', label: 'Books', icon: BookOpen, color: 'var(--color-accent-books)' },
              ].map(({ key, label, icon: Icon, color }) => {
                const genres = profile[key]?.genres || []
                return (
                  <div key={key}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon size={14} style={{ color }} />
                      <span className="text-xs font-medium text-text-muted">{label}</span>
                    </div>
                    {genres.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {genres.map((g) => (
                          <span key={g} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted italic">—</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {!showFullData && (
        <div className="bg-bg-secondary border border-border rounded-2xl p-8 text-center">
          <p className="text-sm text-text-secondary mb-2">
            This profile is public, but we haven't hooked up cross-device data sync yet for Current Favorites, genres, and taste spectrums.
          </p>
          <p className="text-xs text-text-muted">Coming soon!</p>
        </div>
      )}
    </div>
  )

  if (showSelfWrapper) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
        {content}
      </div>
    )
  }
  return content
}
