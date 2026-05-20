import { useParams, Link } from 'react-router-dom'
import { Music, Film, Tv, BookOpen, Lock, Settings, Star, UserPlus, UserMinus, Check } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { usePublicProfileByUsername } from '../hooks/usePublicProfileByUsername'
import { useCatalog } from '../hooks/useCatalog'
import { useUserCatalog } from '../hooks/useUserCatalog'
import { useFriends } from '../hooks/useFriends'
import { determineArchetype } from '../utils/archetypes'
import { getMediaColor } from '../utils/filterUtils'
import CoverArt from '../components/common/CoverArt'
import SpectrumSlider from '../components/common/SpectrumSlider'
import { isSupabaseConfigured } from '../lib/supabase'

const SPECTRUMS = [
  { key: 'mainstream-obscure', leftLabel: 'Mainstream', rightLabel: 'Obscure' },
  { key: 'comfort-challenge', leftLabel: 'Comfort', rightLabel: 'Challenge' },
]

// Inline stats so we can compute over either the owner's catalog or a
// friend's catalog (useCatalog.getStats is hard-wired to the signed-in user).
function computeStats(items) {
  const total = items.length
  const byStatus = { watching: 0, finished: 0, dropped: 0, want: 0 }
  let totalRated = 0
  let ratingSum = 0
  for (const i of items) {
    if (byStatus[i.status] !== undefined) byStatus[i.status]++
    if ((i.rating || 0) > 0) {
      totalRated++
      ratingSum += i.rating
    }
  }
  return {
    total,
    byStatus,
    avgRating: totalRated > 0 ? (ratingSum / totalRated).toFixed(1) : 0,
  }
}

export default function PublicProfile({ isSelf }) {
  const { username } = useParams()
  const { user } = useAuth()
  const { profile } = useTasteProfile()
  const myProfile = usePublicProfile()
  const { items: ownItems } = useCatalog()
  const friendsApi = useFriends()

  // Fetch a Supabase profile when viewing someone else's slug
  const isViewingBySlug = !isSelf && !!username
  const { profile: otherProfile, loading: otherLoading } = usePublicProfileByUsername(
    isViewingBySlug ? username : null
  )

  const isOwnProfile = isSelf || (myProfile.username && myProfile.username.toLowerCase() === (username || '').toLowerCase())

  // Fetch the friend's catalog when looking at their profile. Hook is no-op
  // when userId is null. Needs the public-profiles RLS policy (see docs).
  const friendUserId = !isOwnProfile && otherProfile ? otherProfile.id : null
  const { items: friendItems, loading: friendLoading } = useUserCatalog(friendUserId)

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

  // The catalog backing the visible sections — yours when looking at yourself,
  // their catalog when looking at someone else (gated by RLS to public users).
  const effectiveItems = isOwnProfile ? ownItems : friendItems
  const stats = computeStats(effectiveItems)
  const currentFavorites = [...effectiveItems]
    .filter((i) => (i.rating || 0) >= 4)
    .sort((a, b) => new Date(b.dateConsumed || b.dateAdded || 0) - new Date(a.dateConsumed || a.dateAdded || 0))
    .slice(0, 6)
  const recentlyAdded = [...effectiveItems]
    .sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0))
    .slice(0, 6)

  // Archetype is derived from the Taste Calibrator (the owner's private data),
  // so we only show it on the owner's own view — never for friends/strangers.
  const archetype = isOwnProfile ? determineArchetype(profile) : null

  // Follow/Unfollow state when viewing someone else.
  const isFollowingThisUser = !isOwnProfile && otherProfile ? friendsApi.isFollowing(otherProfile.id) : false
  const handleFollow = () => {
    if (!otherProfile) return
    friendsApi.follow({
      userId: otherProfile.id,
      displayName: otherProfile.display_name || displayProfile.displayName || 'User',
      username: otherProfile.username || '',
      avatarEmoji: otherProfile.avatar_emoji || displayProfile.avatarEmoji || '',
      archetype: '',
    })
  }
  const handleUnfollow = () => {
    if (otherProfile) friendsApi.unfollow(otherProfile.id)
  }

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

        {!isOwnProfile && otherProfile && user && (
          <div className="flex items-center justify-center mt-4">
            {isFollowingThisUser ? (
              <button
                onClick={handleUnfollow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-accent-movies hover:bg-bg-hover transition-colors border border-border"
              >
                <UserMinus size={13} />
                Unfollow
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary text-white hover:bg-accent-hover transition-colors"
              >
                <UserPlus size={13} />
                Follow
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick stats — visible on own profile and on a friend's (from their catalog) */}
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

      {/* Current Favorites — auto-derived from 4★+ catalog items */}
      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-text-primary text-center mb-1">Current Favorites</h2>
        <p className="text-xs text-text-muted text-center mb-5">
          {isOwnProfile ? 'My most recent 4★+ picks' : `${displayProfile.displayName?.split(' ')[0] || 'Their'}'s most recent 4★+ picks`}
        </p>
        {currentFavorites.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {currentFavorites.map((item) => (
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
            <p className="text-sm">
              {isOwnProfile
                ? 'Rate a few things 4 stars or higher and they\'ll show up here.'
                : friendLoading ? 'Loading…' : `${displayProfile.displayName?.split(' ')[0] || 'They'} haven't 4★'d anything yet.`}
            </p>
            {isOwnProfile && (
              <Link to="/catalog" className="text-xs text-accent-primary hover:underline mt-1 inline-block">
                Go to your Catalog
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Right Now — most recent catalog additions */}
      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-text-primary">Right Now</h2>
          {isOwnProfile && (
            <Link to="/catalog" className="text-xs text-accent-primary hover:underline">View catalog</Link>
          )}
        </div>
        <p className="text-xs text-text-muted mb-4">
          {isOwnProfile ? 'Most recent in the catalog' : 'Most recent additions'}
        </p>
        {recentlyAdded.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recentlyAdded.map((item) => {
              const color = getMediaColor(item.type)
              return (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-bg-tertiary">
                  <CoverArt title={item.title} type={item.type} coverUrl={item.coverUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                    <p className="text-xs text-text-muted truncate">{item.creator}</p>
                  </div>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                  >
                    {item.type}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-text-muted">
            <p className="text-sm">
              {isOwnProfile
                ? 'Nothing in the catalog yet.'
                : friendLoading ? 'Loading…' : `${displayProfile.displayName?.split(' ')[0] || 'They'} haven't logged anything yet.`}
            </p>
            {isOwnProfile && (
              <Link to="/" className="text-xs text-accent-primary hover:underline mt-1 inline-block">
                Use Quick Add on the Dashboard
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Taste DNA & Taste Map — PRIVATE: owner only. Friends/strangers never see this. */}
      {isOwnProfile && (
        <>
          <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-text-primary">Taste DNA</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted flex items-center gap-1">
                <Lock size={9} /> Private
              </span>
            </div>
            <p className="text-xs text-text-muted mb-4">Only you can see this.</p>
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

          <div className="bg-bg-secondary border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-text-primary">Taste Map</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted flex items-center gap-1">
                <Lock size={9} /> Private
              </span>
            </div>
            <p className="text-xs text-text-muted mb-4">Everything your Taste Calibrator picks and catalog have taught us. Only you can see this.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { key: 'music', label: 'Music', icon: Music, color: 'var(--color-accent-music)', nameFields: ['artists'], extraFields: ['albums'] },
                { key: 'movies', label: 'Movies', icon: Film, color: 'var(--color-accent-movies)', nameFields: ['directors', 'actors'], extraFields: ['films'] },
                { key: 'tv', label: 'TV', icon: Tv, color: 'var(--color-accent-tv)', nameFields: ['shows', 'creators'], extraFields: [] },
                { key: 'books', label: 'Books', icon: BookOpen, color: 'var(--color-accent-books)', nameFields: ['authors'], extraFields: ['books'] },
              ].map((cat) => {
                const { key, label, color, nameFields, extraFields } = cat
                const Icon = cat.icon
                const stated = profile[key]?.genres || []
                const catType = { music: 'music', movies: 'movie', tv: 'tv', books: 'book' }[key]
                const catalogGenreCounts = {}
                for (const item of effectiveItems) {
                  if (item.type !== catType || !item.genre) continue
                  for (const g of String(item.genre).split(/[,/]+/).map((s) => s.trim()).filter(Boolean)) {
                    catalogGenreCounts[g] = (catalogGenreCounts[g] || 0) + 1
                  }
                }
                const fromCatalog = Object.entries(catalogGenreCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([g]) => g)
                const mergedGenres = [...stated]
                for (const g of fromCatalog)
                  if (!mergedGenres.some((m) => m.toLowerCase() === g.toLowerCase())) mergedGenres.push(g)

                const names = []
                for (const f of [...nameFields, ...extraFields]) {
                  for (const n of profile[key]?.[f] || []) {
                    if (!names.some((x) => x.toLowerCase() === String(n).toLowerCase())) names.push(n)
                  }
                }
                const isEmpty = names.length === 0 && mergedGenres.length === 0
                return (
                  <div key={key} className="rounded-xl border p-4" style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Icon size={14} style={{ color }} />
                      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                    </div>
                    {names.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1.5">
                          {nameFields.includes('directors') ? 'Directors & actors' : nameFields.includes('shows') ? 'Shows & creators' : nameFields.includes('authors') ? 'Authors' : 'Artists'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {names.slice(0, 20).map((n) => (
                            <span key={n} className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary border border-border">
                              {n}
                            </span>
                          ))}
                          {names.length > 20 && (
                            <span className="text-xs px-2 py-0.5 text-text-muted">+{names.length - 20}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {mergedGenres.length > 0 ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1.5">Genres</p>
                        <div className="flex flex-wrap gap-1">
                          {mergedGenres.map((g) => (
                            <span key={g} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {isEmpty && <p className="text-xs text-text-muted italic">Nothing here yet — keep using the Taste Check.</p>}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Friend view footer — privacy note */}
      {!isOwnProfile && (
        <div className="text-center text-[11px] text-text-muted/70 italic mt-2">
          <Check size={10} className="inline -mt-0.5 mr-1" />
          Taste DNA, Taste Map, and Insights stay private to the owner.
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
