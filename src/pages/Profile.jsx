import { useState, useEffect } from 'react'
import { Music, Film, Tv, BookOpen, Check, SlidersHorizontal, Palette, Plus, X, Globe, Lock, Eye, ArrowUp, ArrowDown, Mail, Save } from 'lucide-react'
import TagInput from '../components/common/TagInput'
import SpectrumSlider from '../components/common/SpectrumSlider'
import CoverArt from '../components/common/CoverArt'
import Modal from '../components/common/Modal'
import EmojiPicker from '../components/common/EmojiPicker'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { useTheme } from '../hooks/useTheme'
import { useHeavyRotation } from '../hooks/useHeavyRotation'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { useCatalog } from '../hooks/useCatalog'
import { isSupabaseConfigured } from '../lib/supabase'

const CATEGORIES = [
  {
    key: 'music',
    label: 'Music',
    icon: Music,
    color: 'var(--color-accent-music)',
    fields: [
      { key: 'artists', label: 'Favorite Artists', placeholder: 'e.g. Radiohead, Kendrick Lamar...' },
      { key: 'genres', label: 'Genres You Love', placeholder: 'e.g. Indie Rock, Hip-Hop...' },
      { key: 'albums', label: 'All-Time Favorite Albums', placeholder: 'e.g. OK Computer, DAMN...' },
    ],
  },
  {
    key: 'movies',
    label: 'Movies',
    icon: Film,
    color: 'var(--color-accent-movies)',
    fields: [
      { key: 'directors', label: 'Favorite Directors', placeholder: 'e.g. Denis Villeneuve, Greta Gerwig...' },
      { key: 'actors', label: 'Favorite Actors', placeholder: 'e.g. Florence Pugh, Oscar Isaac...' },
      { key: 'genres', label: 'Genres You Love', placeholder: 'e.g. Sci-Fi, Drama...' },
      { key: 'films', label: 'All-Time Favorite Films', placeholder: 'e.g. Blade Runner 2049, Lady Bird...' },
    ],
  },
  {
    key: 'tv',
    label: 'TV Shows',
    icon: Tv,
    color: 'var(--color-accent-tv)',
    fields: [
      { key: 'shows', label: 'Favorite Shows', placeholder: 'e.g. Severance, The Bear...' },
      { key: 'genres', label: 'Genres You Love', placeholder: 'e.g. Thriller, Comedy...' },
      { key: 'creators', label: 'Favorite Showrunners/Creators', placeholder: 'e.g. Mike White, Vince Gilligan...' },
    ],
  },
  {
    key: 'books',
    label: 'Books',
    icon: BookOpen,
    color: 'var(--color-accent-books)',
    fields: [
      { key: 'authors', label: 'Favorite Authors', placeholder: 'e.g. Ted Chiang, Sally Rooney...' },
      { key: 'genres', label: 'Genres You Love', placeholder: 'e.g. Sci-Fi, Literary Fiction...' },
      { key: 'books', label: 'All-Time Favorite Books', placeholder: 'e.g. Exhalation, Normal People...' },
    ],
  },
]

// Rotating spectrum pool — 2 shown per week, changes each week
const ALL_SPECTRUMS = [
  // Evergreen
  { key: 'mainstream-obscure', leftLabel: 'Mainstream', rightLabel: 'Obscure' },
  { key: 'comfort-challenge', leftLabel: 'Comfort', rightLabel: 'Challenge' },
  // Fun & quirky
  { key: 'neogoth-maximalist', leftLabel: 'Neo-Goth', rightLabel: 'Period Piece Maximalist' },
  { key: 'binge-savor', leftLabel: 'Binge It All', rightLabel: 'Savor One Episode' },
  { key: 'crying-laughing', leftLabel: 'Make Me Cry', rightLabel: 'Make Me Laugh' },
  { key: 'plot-vibes', leftLabel: 'Plot-Driven', rightLabel: 'Pure Vibes' },
  { key: 'cerebral-visceral', leftLabel: 'Cerebral', rightLabel: 'Visceral' },
  { key: 'nostalgic-futurist', leftLabel: 'Nostalgic', rightLabel: 'Futurist' },
  { key: 'lo-fi-epic', leftLabel: 'Lo-Fi & Intimate', rightLabel: 'Epic & Sweeping' },
  { key: 'critic-fan', leftLabel: 'Inner Critic', rightLabel: 'Inner Fan' },
  { key: 'solo-communal', leftLabel: 'Solitary Consumer', rightLabel: 'Group Watch Party' },
  { key: 'chaotic-curated', leftLabel: 'Chaotic Queue', rightLabel: 'Curated Queue' },
  { key: 'dark-cozy', leftLabel: 'Dark & Unsettling', rightLabel: 'Warm & Cozy' },
  { key: 'analog-digital', leftLabel: 'Vinyl & Paperbacks', rightLabel: 'Streaming Everything' },
]

function getWeeklySpectrums() {
  const now = new Date()
  const weekSeed = now.getFullYear() * 100 + Math.floor((now.getMonth() * 30 + now.getDate()) / 7)
  // Always show the 2 evergreen ones + 2 rotating quirky ones
  const quirky = ALL_SPECTRUMS.slice(2)
  const i1 = weekSeed % quirky.length
  const i2 = (weekSeed + 7) % quirky.length === i1 ? (weekSeed + 3) % quirky.length : (weekSeed + 7) % quirky.length
  return [
    ALL_SPECTRUMS[0], // mainstream-obscure (always)
    ALL_SPECTRUMS[1], // comfort-challenge (always)
    quirky[i1],
    quirky[i2],
  ]
}

export default function Profile({ hidePublicProfile = false, hideHeader = false } = {}) {
  const { profile, addTag, removeTag, isProfileEmpty, getSpectrum, setSpectrum } = useTasteProfile()
  const { themeIndex, setTheme, themes } = useTheme()
  const { itemIds, addToRotation, removeFromRotation, reorder } = useHeavyRotation()
  const publicProfile = usePublicProfile()
  const { items: catalogItems } = useCatalog()
  const [activeTab, setActiveTab] = useState('music')
  const [showRotationPicker, setShowRotationPicker] = useState(false)

  // Local draft state for public profile fields that need a Save action
  const [usernameDraft, setUsernameDraft] = useState('')
  const [bioDraft, setBioDraft] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    setUsernameDraft(publicProfile.username || '')
    setBioDraft(publicProfile.bio || '')
  }, [publicProfile.username, publicProfile.bio])

  const hasProfileChanges = usernameDraft !== (publicProfile.username || '') || bioDraft !== (publicProfile.bio || '')

  const handleSaveProfile = async () => {
    const cleanUsername = usernameDraft.toLowerCase().replace(/[^a-z0-9-_]/g, '')
    await publicProfile.savePublicProfile({ username: cleanUsername, bio: bioDraft })
    setSaveMessage('Saved!')
    setTimeout(() => setSaveMessage(''), 2500)
  }

  const activeCat = CATEGORIES.find((c) => c.key === activeTab)
  const rotationItems = itemIds.map((id) => catalogItems.find((i) => i.id === id)).filter(Boolean)
  const availableForRotation = catalogItems.filter((i) => !itemIds.includes(i.id))

  const getTagCount = (catKey) => {
    const cat = profile[catKey]
    if (!cat) return 0
    return Object.values(cat).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0)
  }

  return (
    <div>
      {!hideHeader && (
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Taste Calibrator</h1>
          <p className="text-text-secondary">
            Tune the dials on your taste. The more you tell us, the better your radar gets.
          </p>
        </div>
      )}

      {/* ─── Theme Picker ─── */}
      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette size={20} className="text-accent-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Your Vibe</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((theme, i) => (
            <button
              key={theme.name}
              onClick={() => setTheme(i)}
              className={`p-3 rounded-xl border-2 transition-all text-left ${
                themeIndex === i ? 'shadow-lg scale-[1.02]' : 'hover:scale-[1.01]'
              }`}
              style={{
                backgroundColor: theme.bg.secondary,
                borderColor: themeIndex === i ? theme.accents.primary : theme.border,
              }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: theme.text.primary, fontFamily: theme.headingFont }}>
                {theme.name}
              </p>
              <p className="text-xs mb-2" style={{ color: theme.text.muted }}>{theme.tagline}</p>
              <div className="flex gap-1">
                {[theme.accents.music, theme.accents.movies, theme.accents.tv, theme.accents.books, theme.accents.primary].map((c, j) => (
                  <div key={j} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              {themeIndex === i && (
                <div className="flex items-center gap-1 mt-2 text-xs font-medium" style={{ color: theme.accents.primary }}>
                  <Check size={12} /> Active
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Current Favorites ─── */}
      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Current Favorites</h2>
          {catalogItems.length > 0 && itemIds.length < 8 && (
            <button
              onClick={() => setShowRotationPicker(true)}
              className="flex items-center gap-1 text-xs text-accent-primary hover:underline"
            >
              <Plus size={14} /> Add
            </button>
          )}
        </div>
        <p className="text-xs text-text-muted mb-4">What I'm endorsing this week. Up to 8 picks. Shows on your public profile.</p>
        {rotationItems.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {rotationItems.map((item, idx) => (
              <div key={item.id} className="text-center group relative">
                <CoverArt title={item.title} type={item.type} coverUrl={item.coverUrl} size="md" className="mx-auto" />
                <p className="text-xs font-medium text-text-primary mt-1.5 truncate">{item.title}</p>
                <p className="text-xs text-text-muted truncate">{item.creator}</p>
                <button
                  onClick={() => removeFromRotation(item.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-bg-primary border border-border flex items-center justify-center text-text-muted hover:text-accent-movies opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-bg-tertiary rounded-xl">
            <p className="text-sm text-text-muted mb-2">No items in rotation yet</p>
            {catalogItems.length > 0 ? (
              <button
                onClick={() => setShowRotationPicker(true)}
                className="text-sm text-accent-primary hover:underline"
              >
                Pick your favorites
              </button>
            ) : (
              <p className="text-xs text-text-muted">Add items to your catalog first</p>
            )}
          </div>
        )}
      </div>

      {/* Heavy Rotation picker modal */}
      <Modal isOpen={showRotationPicker} onClose={() => setShowRotationPicker(false)} title="Add to Heavy Rotation" maxWidth="500px">
        <p className="text-sm text-text-muted mb-4">Pick up to {8 - itemIds.length} more items from your catalog.</p>
        {availableForRotation.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {availableForRotation.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  addToRotation(item.id)
                  if (itemIds.length >= 7) setShowRotationPicker(false)
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors text-left"
              >
                <CoverArt title={item.title} type={item.type} coverUrl={item.coverUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                  <p className="text-xs text-text-muted truncate">{item.creator}</p>
                </div>
                <Plus size={16} className="text-accent-primary shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-8">All catalog items are already in your rotation!</p>
        )}
      </Modal>

      {/* ─── Public Profile Settings ─── */}
      {!hidePublicProfile && <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={20} className="text-accent-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Public Profile</h2>
        </div>
        <div className="space-y-5">
          {/* Avatar + emoji picker */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Your avatar</label>
            <div className="flex items-start gap-4">
              <EmojiPicker
                value={publicProfile.avatarEmoji}
                onChange={publicProfile.setAvatarEmoji}
              />
              <div className="flex-1 text-xs text-text-muted pt-3">
                Pick an emoji to be your avatar on your public profile. Or don't — we're not your parents.
              </div>
            </div>
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <p className="text-sm font-medium text-text-primary">Make profile public</p>
              <p className="text-xs text-text-muted">Let anyone at /{publicProfile.username || 'your-username'} see your profile.</p>
            </div>
            <button
              onClick={publicProfile.togglePublic}
              className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ml-3 ${publicProfile.isPublic ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${publicProfile.isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Username</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-bg-tertiary border border-border rounded-lg focus-within:border-accent-primary transition-colors overflow-hidden">
                <span className="px-3 text-sm text-text-muted border-r border-border select-none">/</span>
                <input
                  type="text"
                  value={usernameDraft}
                  onChange={(e) => setUsernameDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  placeholder="leckybang"
                  maxLength={30}
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>
              {publicProfile.username && publicProfile.username === usernameDraft && (
                <a
                  href={`/u/${publicProfile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-2 text-xs text-accent-primary hover:underline"
                >
                  <Eye size={14} /> View
                </a>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1.5">Letters, numbers, dashes. This will be your URL.</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Bio</label>
            <textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value.slice(0, 160))}
              placeholder="A few words about your taste, vibe, or whatever."
              rows={2}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors resize-none"
            />
            <p className="text-xs text-text-muted mt-1">{bioDraft.length}/160</p>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-text-muted">
              {saveMessage ? <span className="text-accent-books flex items-center gap-1"><Check size={12} />{saveMessage}</span> : publicProfile.saving ? 'Saving…' : ''}
            </span>
            <button
              onClick={handleSaveProfile}
              disabled={!hasProfileChanges || publicProfile.saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent-primary hover:bg-accent-hover text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              Save Profile
            </button>
          </div>

          {/* Email opt-in */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-accent-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">Email me my Weekly Radar</p>
                <p className="text-xs text-text-muted">Every Monday morning, get a personalized dispatch in your inbox.</p>
                {publicProfile.emailRadar && !isSupabaseConfigured && (
                  <p className="text-xs text-amber-500 mt-1">⚠️ Requires Supabase + a scheduled function to actually send. See docs/EMAIL_RADAR_SETUP.md.</p>
                )}
              </div>
            </div>
            <button
              onClick={publicProfile.toggleEmailRadar}
              className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ml-3 ${publicProfile.emailRadar ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${publicProfile.emailRadar ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>}

      {/* ─── Taste Spectrums ─── */}
      <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <SlidersHorizontal size={20} className="text-accent-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Your Taste DNA</h2>
        </div>
        <p className="text-sm text-text-muted mb-6">Drag these to map your psyche. New spectrums rotate in every week because we're nosy like that.</p>
        <div className="space-y-8">
          {getWeeklySpectrums().map((spectrum) => (
            <div key={spectrum.key}>
              <SpectrumSlider
                leftLabel={spectrum.leftLabel}
                rightLabel={spectrum.rightLabel}
                value={getSpectrum(spectrum.key)}
                onChange={(val) => setSpectrum(spectrum.key, val)}
                color="var(--color-accent-primary)"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ─── Category tabs ─── */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const count = getTagCount(cat.key)
          const isActive = activeTab === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'border-2'
                  : 'bg-bg-secondary border border-border text-text-secondary hover:bg-bg-hover'
              }`}
              style={isActive ? {
                backgroundColor: `color-mix(in srgb, ${cat.color} 15%, transparent)`,
                borderColor: cat.color,
                color: cat.color,
              } : {}}
            >
              <Icon size={18} />
              {cat.label}
              {count > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isActive ? cat.color : 'var(--color-bg-tertiary)',
                    color: isActive ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── Active category fields ─── */}
      {activeCat && (
        <div className="bg-bg-secondary border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <activeCat.icon size={24} style={{ color: activeCat.color }} />
            <h2 className="text-lg font-semibold">{activeCat.label}</h2>
          </div>
          {activeCat.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-text-secondary mb-2">{field.label}</label>
              <TagInput
                tags={profile[activeCat.key]?.[field.key] || []}
                onAdd={(val) => addTag(activeCat.key, field.key, val)}
                onRemove={(val) => removeTag(activeCat.key, field.key, val)}
                placeholder={field.placeholder}
                color={activeCat.color}
              />
            </div>
          ))}
        </div>
      )}

      {!isProfileEmpty() && (
        <div className="mt-6 flex items-center gap-2 text-sm text-accent-books">
          <Check size={16} />
          <span>Your taste profile is saved automatically. It powers your Weekly Radar!</span>
        </div>
      )}
    </div>
  )
}
