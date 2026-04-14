import { useParams, Link } from 'react-router-dom'
import { Music, Film, Tv, BookOpen, Lock, Globe, Settings, Star } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { useHeavyRotation } from '../hooks/useHeavyRotation'
import { useCatalog } from '../hooks/useCatalog'
import { determineArchetype } from '../utils/archetypes'
import CoverArt from '../components/common/CoverArt'
import SpectrumSlider from '../components/common/SpectrumSlider'

const SPECTRUMS = [
  { key: 'mainstream-obscure', leftLabel: 'Mainstream', rightLabel: 'Obscure' },
  { key: 'comfort-challenge', leftLabel: 'Comfort', rightLabel: 'Challenge' },
]

export default function PublicProfile({ isSelf }) {
  const { username } = useParams()
  const { user } = useAuth()
  const { profile } = useTasteProfile()
  const { isPublic, username: myUsername } = usePublicProfile()
  const { itemIds } = useHeavyRotation()
  const { items, getStats } = useCatalog()

  const isOwnProfile = isSelf || myUsername === username || user?.uid === username
  const canView = isOwnProfile ? true : isPublic

  if (!canView) {
    return (
      <div className="text-center py-16">
        <Lock size={48} className="mx-auto text-text-muted/30 mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Nothing to see here... yet</h1>
        <p className="text-text-secondary">This person is keeping their taste under wraps for now.</p>
      </div>
    )
  }

  const archetype = determineArchetype(profile)
  const rotationItems = itemIds.map((id) => items.find((i) => i.id === id)).filter(Boolean)
  const stats = getStats()

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary text-4xl font-bold mx-auto mb-4">
          {user?.displayName?.[0]?.toUpperCase() || '?'}
        </div>
        <h1 className="text-2xl font-bold text-text-primary">{user?.displayName}</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-xl">{archetype.emoji}</span>
          <span className="text-text-secondary font-medium">{archetype.name}</span>
        </div>
        <p className="text-sm text-text-muted mt-1 italic max-w-md mx-auto">{archetype.description}</p>

        {isOwnProfile && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <Link to="/calibrate" className="text-xs text-accent-primary hover:underline flex items-center gap-1">
              <Settings size={12} /> Edit Taste Calibrator
            </Link>
          </div>
        )}
      </div>

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

      {/* The Heavy Rotation */}
      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-text-primary text-center mb-1">The Heavy Rotation</h2>
        <p className="text-xs text-text-muted text-center mb-5">What's getting all the plays right now</p>
        {rotationItems.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {rotationItems.map((item) => (
              <div key={item.id} className="text-center">
                <CoverArt title={item.title} type={item.type} creator={item.creator} size="lg" className="mx-auto" />
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
              <Link to="/calibrate" className="text-xs text-accent-primary hover:underline mt-1 inline-block">
                Set up your Heavy Rotation in the Calibrator
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
    </div>
  )
}
