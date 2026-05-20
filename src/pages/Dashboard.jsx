import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Music, Film, Tv, BookOpen, Radar, Star, CalendarPlus, Plus, ArrowRight, Sparkles, Library, MessageCircle, X, Send } from 'lucide-react'
import { useCatalog } from '../hooks/useCatalog'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { useScratchpad } from '../hooks/useScratchpad'
import { useAuth } from '../hooks/useAuth'
import { useWeeklyRadar } from '../hooks/useWeeklyRadar'
import { getMediaColor, MEDIA_TYPES } from '../utils/filterUtils'
import { formatDate } from '../utils/dateUtils'
import CoverArt from '../components/common/CoverArt'
import MediaPickerInput from '../components/common/MediaPickerInput'
import CalibrationOnboarding from '../components/CalibrationOnboarding'
import CalibrationWidget from '../components/CalibrationWidget'
import CatalogInsights from '../components/CatalogInsights'
import QuickAdd from '../components/QuickAdd'
import { CALIBRATION_QUESTIONS } from '../data/calibrationData'

const SCRATCHPAD_TYPE_TO_SEARCH = {
  music: ['music'],
  movie: ['movie'],
  tv: ['tv'],
  book: ['book'],
}

const TYPE_ICONS = { music: Music, movie: Film, tv: Tv, book: BookOpen }


// ─── Time-based greeting ───
function getGreeting(name) {
  const hour = new Date().getHours()
  const first = name?.split(' ')[0] || 'there'
  if (hour < 12) return `Good morning, ${first}.`
  if (hour < 17) return `Good afternoon, ${first}.`
  return `Good evening, ${first}.`
}

export default function Dashboard() {
  const { user } = useAuth()
  const { items, getStats, addItem } = useCatalog()
  const { profile, isProfileEmpty, addTag, saveProfile } = useTasteProfile()
  const { radar, loading: radarLoading, isDemo: radarIsDemo } = useWeeklyRadar()
  const { notes, addNote, deleteNote } = useScratchpad()
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState('movie')
  const [noteMeta, setNoteMeta] = useState(null) // from picked search result

  // Onboarding: show once when profile is empty and user hasn't gone through it yet
  const onboardingKey = user ? `cc_onboarding_done_${user.uid}` : null
  const [showOnboarding, setShowOnboarding] = useState(
    () => !!(onboardingKey && !localStorage.getItem(onboardingKey))
  )

  const handleOnboardingComplete = (selections) => {
    const updates = { ...profile }
    for (const [qId, values] of Object.entries(selections)) {
      const q = CALIBRATION_QUESTIONS.find((cq) => cq.id === qId)
      if (!q) continue
      const existing = updates[q.category]?.[q.field] || []
      const merged = [...new Set([...existing, ...values])]
      updates[q.category] = { ...(updates[q.category] || {}), [q.field]: merged }
    }
    saveProfile(updates)
    if (onboardingKey) localStorage.setItem(onboardingKey, '1')
    setShowOnboarding(false)
  }

  const stats = getStats()

  // Capture "now" once at mount so the render stays pure (no Date.now() during render).
  const [mountTs] = useState(() => Date.now())
  const addedThisWeek = useMemo(() => {
    const weekAgo = mountTs - 7 * 86400000
    return items.filter((i) => new Date(i.dateAdded || 0).getTime() >= weekAgo).length
  }, [items, mountTs])

  const recentItems = items.slice(0, 5)

  // Dashboard Radar preview now shows one pick from each of the three radar
  // buckets (Hyped / Overhyped / Critics' Darlings) — generic, no letter.
  const radarPreview = useMemo(() => {
    if (!radar) return []
    return [
      { bucket: 'Hyped', item: radar.hyped?.[0] },
      { bucket: 'Hyped', item: radar.hyped?.[1] },
      { bucket: "Critics' Darlings", item: radar.darlings?.[0] },
    ].filter((p) => p.item)
  }, [radar])

  // Only nudge profile-building when it's empty. (Radar link removed — Radar
  // shows up further down anyway.)
  const showBuildProfile = isProfileEmpty()

  // Show the Taste Check beside Quick Add only when it's actually available:
  // non-demo user who hasn't dismissed it for the day. Mirrors the widget's
  // own daily-dismiss logic so the two-column layout doesn't leave a gap.
  const calibrationDismissed = useMemo(() => {
    if (!user || user.uid?.startsWith('demo')) return true
    const d = new Date()
    return !!localStorage.getItem(`cc_calibration_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}_${user.uid}`)
  }, [user])
  const showCalibration = !!user && !user.uid?.startsWith('demo') && !calibrationDismissed

  const handleAddNote = () => {
    if (!noteText.trim()) return
    const payload = noteMeta
      ? {
          text: noteMeta.title,
          type: noteMeta.type,
          creator: noteMeta.creator || '',
          year: noteMeta.year || '',
          coverUrl: noteMeta.coverUrl || '',
        }
      : { text: noteText, type: noteType }
    addNote(payload)
    setNoteText('')
    setNoteMeta(null)
  }

  const handlePick = (result) => {
    if (result.kind === 'text') {
      setNoteMeta(null)
      setNoteText(result.title)
    } else {
      setNoteMeta(result)
      setNoteText(result.title)
    }
  }

  return (
    <div>
      {showOnboarding && (
        <CalibrationOnboarding
          onComplete={handleOnboardingComplete}
          onDismiss={() => {
            if (onboardingKey) localStorage.setItem(onboardingKey, '1')
            setShowOnboarding(false)
          }}
        />
      )}

      {/* ─── Hero Greeting ─── */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
          {getGreeting(user?.displayName)}
        </h1>
        <p className="text-text-secondary">Here's the vibe check on your media universe.</p>
      </div>

      {/* ─── Quick Add + Taste Check, side-by-side on desktop ─── */}
      <div
        className={`grid grid-cols-1 gap-4 mb-6 items-start ${
          showCalibration ? 'lg:grid-cols-2' : ''
        }`}
      >
        <QuickAdd addItem={addItem} />
        {showCalibration && (
          <CalibrationWidget user={user} profile={profile} addTag={addTag} />
        )}
      </div>

      {/* Build-profile nudge (only when empty) */}
      {showBuildProfile && (
        <div className="mb-8">
          <Link
            to="/me?tab=taste"
            className="inline-flex items-center gap-2 text-sm text-accent-primary hover:underline"
          >
            <Sparkles size={14} />
            Build Your Taste Profile
          </Link>
        </div>
      )}
      {!showBuildProfile && <div className="mb-2" />}

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Cataloged', value: stats.total, icon: Library, to: '/catalog' },
          { label: 'This Week', value: addedThisWeek, icon: CalendarPlus, color: 'var(--color-accent-primary)', to: '/catalog' },
          { label: 'Avg Rating', value: stats.avgRating || '—', icon: Star, color: '#f59e0b' },
          { label: 'Finished', value: stats.byStatus.finished, icon: Sparkles, color: 'var(--color-accent-books)' },
        ].map((stat) => {
          const { label, value, color, to } = stat
          const Icon = stat.icon
          const inner = (
            <>
              <Icon size={16} style={{ color: color || 'var(--color-text-muted)' }} />
              <span className="text-xl font-bold text-text-primary">{value}</span>
              <span className="text-xs text-text-muted">{label}</span>
            </>
          )
          return to ? (
            <Link key={label} to={to} className="bg-bg-secondary border border-border rounded-xl p-3 flex flex-col items-center gap-1 hover:border-accent-primary/30 transition-all">
              {inner}
            </Link>
          ) : (
            <div key={label} className="bg-bg-secondary border border-border rounded-xl p-3 flex flex-col items-center gap-1">
              {inner}
            </div>
          )
        })}
      </div>

      {/* ─── Insights ─── */}
      <div className="mb-8">
        <CatalogInsights items={items} />
      </div>

      {/* ─── Main Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Left column */}
        <div className="space-y-6">
          {/* Scratchpad */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={18} className="text-accent-primary" />
              <h2 className="font-semibold text-text-primary">Someone Told Me About...</h2>
            </div>
            <p className="text-xs text-text-muted mb-3">For when someone says "you HAVE to watch this" and you need to write it down before your brain deletes it.</p>

            {/* Type toggle — determines which API to search */}
            <div className="flex gap-1 mb-3">
              {MEDIA_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setNoteType(t.value)
                    setNoteMeta(null)
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    noteType === t.value
                      ? 'border-transparent'
                      : 'bg-bg-tertiary border-border text-text-muted hover:bg-bg-hover'
                  }`}
                  style={noteType === t.value ? {
                    backgroundColor: `color-mix(in srgb, ${t.color} 20%, transparent)`,
                    color: t.color,
                  } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search input (auto-populates from real APIs) */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <MediaPickerInput
                  value={noteText}
                  onChange={(v) => {
                    setNoteText(v)
                    if (noteMeta && v !== noteMeta.title) setNoteMeta(null)
                  }}
                  onPick={handlePick}
                  placeholder={`Search ${noteType === 'music' ? 'Spotify' : noteType === 'book' ? 'books' : noteType === 'tv' ? 'TV shows' : 'movies'}...`}
                  preferredTypes={SCRATCHPAD_TYPE_TO_SEARCH[noteType] || ['movie']}
                />
              </div>
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="p-2 bg-accent-primary/10 text-accent-primary rounded-lg hover:bg-accent-primary/20 transition-colors disabled:opacity-30 self-start"
                title="Save note"
              >
                <Send size={16} />
              </button>
            </div>

            {/* Notes list */}
            {notes.length > 0 ? (
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {notes.map((note) => {
                  const TypeIcon = note.type ? TYPE_ICONS[note.type] : null
                  const typeColor = note.type ? getMediaColor(note.type) : null
                  return (
                    <div key={note.id} className="flex items-center gap-3 group p-2 rounded-lg hover:bg-bg-tertiary transition-colors">
                      {note.coverUrl ? (
                        <img
                          src={note.coverUrl}
                          alt=""
                          className="w-8 h-10 rounded object-cover shrink-0"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : TypeIcon ? (
                        <div
                          className="w-8 h-10 rounded flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `color-mix(in srgb, ${typeColor} 15%, transparent)` }}
                        >
                          <TypeIcon size={14} style={{ color: typeColor }} />
                        </div>
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{note.text}</p>
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {note.creator && <span>{note.creator}{note.year ? ` · ${note.year}` : ''} · </span>}
                          {formatDate(note.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1 rounded text-text-muted/0 group-hover:text-text-muted hover:text-accent-movies transition-colors shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic text-center py-4">Empty. For now. Next time someone corners you at a party with a rec, this is your escape plan.</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Radar preview — one pick from each bucket */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-text-primary">Weekly Radar</h2>
              <Link to="/radar" className="text-sm text-accent-primary hover:underline flex items-center gap-1">
                See all picks <ArrowRight size={14} />
              </Link>
            </div>
            <p className="text-xs text-text-muted mb-3">Hyped · Overhyped · Critics' Darlings.</p>
            {radarIsDemo && radar && (
              <p className="text-xs text-text-muted mb-3 italic">
                Demo picks. Sign in for real ones.
              </p>
            )}
            {radar && radarPreview.length > 0 ? (
              <div className="space-y-2">
                {radarPreview.map(({ bucket, item }, i) => (
                  <Link to="/radar" key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors">
                    <CoverArt title={item.title} type={item.type} coverUrl={item.coverUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-accent-primary font-medium">{bucket}</p>
                      <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                      <p className="text-xs text-text-muted truncate">{item.creator}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : radarLoading ? (
              <div className="text-center py-8">
                <Radar size={24} className="mx-auto text-text-muted/30 mb-2 animate-pulse" />
                <p className="text-text-muted text-sm">Pulling this week's picks…</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Radar size={24} className="mx-auto text-text-muted/30 mb-2" />
                <p className="text-text-muted text-sm mb-3">Set up your taste profile for recommendations</p>
                <Link to="/me?tab=taste" className="inline-flex items-center gap-1 text-sm text-accent-primary hover:underline">
                  Build profile <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>

          {/* Recent in Catalog */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-text-primary">Recent in Catalog</h2>
              <Link to="/catalog" className="text-sm text-accent-primary hover:underline flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {recentItems.length > 0 ? (
              <div className="space-y-2">
                {recentItems.map((item) => {
                  return (
                    <Link to="/catalog" key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors">
                      <CoverArt title={item.title} type={item.type} coverUrl={item.coverUrl} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                        <p className="text-xs text-text-muted truncate">{item.creator}</p>
                      </div>
                      {item.rating > 0 && (
                        <div className="flex items-center gap-1 text-amber-500 shrink-0">
                          <Star size={12} fill="currentColor" />
                          <span className="text-xs font-medium">{item.rating}</span>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-text-muted text-sm mb-3">No items yet</p>
                <span className="inline-flex items-center gap-1 text-sm text-text-muted">
                  <Plus size={14} /> Use Quick Add above to get started
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
