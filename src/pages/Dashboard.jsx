import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Music, Film, Tv, BookOpen, Radar, Star, CalendarPlus, Plus, ArrowRight, Sparkles, Library, MessageCircle, X, Send, Lightbulb } from 'lucide-react'
import { useCatalog } from '../hooks/useCatalog'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { useScratchpad } from '../hooks/useScratchpad'
import { useAuth } from '../hooks/useAuth'
import { useWeeklyRadar } from '../hooks/useWeeklyRadar'
import { getMediaColor, MEDIA_TYPES } from '../utils/filterUtils'
import { formatDate } from '../utils/dateUtils'
import CoverArt from '../components/common/CoverArt'
import MediaPickerInput from '../components/common/MediaPickerInput'
import { generateWeeklyLetter } from '../utils/weeklyLetter'
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

// ─── Tidbits generator ───
function generateTidbits(stats, profile, addedThisWeek) {
  const tidbits = []
  const seed = new Date().getFullYear() * 100 + Math.floor(new Date().getDate() / 7)

  // Milestone celebrations
  if (stats.total === 0) {
    tidbits.push({ emoji: '👀', text: "Your catalog is giving 'new apartment, no furniture.' Let's fix that." })
  } else if (stats.total >= 50) {
    tidbits.push({ emoji: '🏛️', text: `${stats.total} items. At this point your catalog qualifies as a cultural institution.` })
  } else if (stats.total >= 25) {
    tidbits.push({ emoji: '📚', text: `${stats.total} items deep. You're not cataloging anymore, you're curating.` })
  } else if (stats.total >= 10) {
    tidbits.push({ emoji: '🎉', text: `Double digits! ${stats.total} items. Your radar is officially paying attention to you now.` })
  }

  // Recent activity
  if (addedThisWeek >= 5) {
    tidbits.push({ emoji: '🔥', text: `${addedThisWeek} things added this week. Someone's been busy consuming culture.` })
  } else if (addedThisWeek === 0 && stats.total > 0) {
    tidbits.push({ emoji: '📮', text: "Nothing logged this week yet. Quick — what's the last thing you watched or read?" })
  }

  // Genre loyalty
  const allGenres = [
    ...(profile.music?.genres || []),
    ...(profile.movies?.genres || []),
    ...(profile.tv?.genres || []),
    ...(profile.books?.genres || []),
  ]
  if (allGenres.length > 0) {
    const genreCounts = {}
    allGenres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1 })
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]
    if (topGenre[1] >= 2) {
      tidbits.push({ emoji: '🎯', text: `"${topGenre[0]}" keeps showing up like it's your personality type. (It might be.)` })
    }
  }

  // Type balance
  if (stats.byType.music > 0 && stats.byType.book > 0 && stats.byType.movie > 0) {
    tidbits.push({ emoji: '🦄', text: "Music, film, AND books? A true triple-threat consumer. We see you." })
  } else if (stats.total > 3 && stats.byType.music === stats.total) {
    tidbits.push({ emoji: '🎵', text: "Your catalog is 100% music. No notes. (Well, actually, lots of notes.)" })
  }

  // Prompts (always available)
  const prompts = [
    { emoji: '🌶️', text: "Spicy prompt: what's the most overrated thing in your catalog? Be honest. We won't tell." },
    { emoji: '💬', text: "Has anyone recommended something to you lately? Drop it in the scratchpad before you forget and feel guilty about it in 3 months." },
    { emoji: '🔄', text: "Remember that thing you gave 2 stars? Go revisit it. Redemption arcs are real." },
    { emoji: '🎰', text: "Feeling indecisive? Go to your Radar and commit to the first thing that makes you go 'huh.'" },
    { emoji: '🪩', text: "Hot take: rate the last thing you finished. Future-you will want to remember what you thought." },
    { emoji: '🧊', text: "Cold take: you have objectively great taste. We checked." },
    { emoji: '📱', text: "Quick — text a friend the last thing you 5-starred. They need to know." },
  ]
  tidbits.push(prompts[seed % prompts.length])

  // Return 2 tidbits max, deterministically selected
  return tidbits.slice(0, 2)
}

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
  const tidbits = generateTidbits(stats, profile, addedThisWeek)

  const letter = useMemo(() => {
    if (!radar) return null
    return generateWeeklyLetter(profile, radar)
  }, [profile, radar])

  // Build a teaser from the letter
  const radarTeaser = useMemo(() => {
    if (!letter || letter.sections.length === 0) return null
    const first = letter.sections[0]
    const raw = first.body.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
    const firstSentence = raw.split(/\.\s/)[0] + '.'
    return { emoji: first.emoji, title: first.title, teaser: firstSentence }
  }, [letter])

  // Secondary contextual CTA
  let cta = null
  if (isProfileEmpty()) {
    cta = { to: '/me?tab=taste', label: 'Build Your Taste Profile', icon: Sparkles }
  } else if (radar) {
    cta = { to: '/radar', label: 'Check Your Weekly Radar', icon: Radar }
  }

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

      {/* ─── Quick Add (primary entry point — adds straight to catalog) ─── */}
      <div className="mb-4">
        <QuickAdd addItem={addItem} />
      </div>

      {/* Secondary contextual CTA */}
      {cta && (
        <div className="mb-8">
          <Link
            to={cta.to}
            className="inline-flex items-center gap-2 text-sm text-accent-primary hover:underline"
          >
            <cta.icon size={14} />
            {cta.label}
          </Link>
        </div>
      )}
      {!cta && <div className="mb-8" />}

      {/* ─── Daily Taste Calibration ─── */}
      {user && !user.uid?.startsWith('demo') && (
        <CalibrationWidget user={user} profile={profile} addTag={addTag} />
      )}

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
          {/* Weekly Tidbits */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={18} className="text-accent-primary" />
              <h2 className="font-semibold text-text-primary">This Week</h2>
            </div>
            <div className="space-y-3">
              {tidbits.map((tidbit, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-bg-tertiary rounded-xl">
                  <span className="text-lg shrink-0">{tidbit.emoji}</span>
                  <p className="text-sm text-text-secondary leading-relaxed">{tidbit.text}</p>
                </div>
              ))}
            </div>
          </div>

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
          {/* Radar preview */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-text-primary">Weekly Radar</h2>
              <Link to="/radar" className="text-sm text-accent-primary hover:underline flex items-center gap-1">
                Read the full letter <ArrowRight size={14} />
              </Link>
            </div>
            {radarIsDemo && radar && (
              <p className="text-xs text-text-muted mb-3 italic">
                Demo picks — affectionately fictional. Sign in for real releases.
              </p>
            )}
            {radar ? (
              <div className="space-y-3">
                {radarTeaser && (
                  <Link to="/radar" className="block p-3 bg-bg-tertiary rounded-xl hover:bg-bg-hover transition-colors">
                    <p className="text-sm text-text-secondary leading-relaxed italic">
                      "{radarTeaser.teaser}"
                    </p>
                    <p className="text-xs text-accent-primary mt-1.5">Read this week's full dispatch →</p>
                  </Link>
                )}
                {(radar.picks || radar.newReleases || []).slice(0, 3).map((item, i) => {
                  return (
                    <Link to="/radar" key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors">
                      <CoverArt title={item.title} type={item.type} coverUrl={item.coverUrl} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                        <p className="text-xs text-text-muted truncate">{item.creator}</p>
                      </div>
                      {item.releaseDate && (
                        <span className="text-xs text-text-muted shrink-0">{formatDate(item.releaseDate)}</span>
                      )}
                    </Link>
                  )
                })}
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
