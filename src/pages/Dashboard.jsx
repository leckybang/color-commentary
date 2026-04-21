import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Music, Film, Tv, BookOpen, Calendar, Radar, Star, TrendingUp, Plus, ArrowRight, Sparkles, Library, MessageCircle, X, Send, Lightbulb, BookMarked, Headphones, Eye } from 'lucide-react'
import { useCatalog } from '../hooks/useCatalog'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { useWeeklyDumps } from '../hooks/useWeeklyDumps'
import { useScratchpad } from '../hooks/useScratchpad'
import { useAuth } from '../hooks/useAuth'
import { useWeeklyRadar } from '../hooks/useWeeklyRadar'
import { getMediaColor, MEDIA_TYPES } from '../utils/filterUtils'
import { formatDate } from '../utils/dateUtils'
import CoverArt from '../components/common/CoverArt'
import MediaPickerInput from '../components/common/MediaPickerInput'
import MediaSearchInput from '../components/common/MediaSearchInput'
import { generateWeeklyLetter } from '../utils/weeklyLetter'

// Liner Notes section configs (mirrors Weekly.jsx)
const LINER_SECTIONS = [
  { key: 'listening', label: 'Listening to', icon: Headphones, color: 'var(--color-accent-music)', placeholder: 'Add an album, artist, or track...', preferredTypes: ['music'] },
  { key: 'watching',  label: 'Watching',     icon: Eye,        color: 'var(--color-accent-movies)', placeholder: 'Add a movie or show...', preferredTypes: ['movie', 'tv'] },
  { key: 'reading',   label: 'Reading',      icon: BookOpen,   color: 'var(--color-accent-books)',  placeholder: 'Add a book...', preferredTypes: ['book'] },
  { key: 'discovered',label: 'Discovered',   icon: Sparkles,   color: 'var(--color-accent-primary)', placeholder: 'Anything new...', preferredTypes: ['music', 'movie', 'tv', 'book'] },
]

function linerTagKey(tag) {
  if (typeof tag === 'string') return `text:${tag.toLowerCase()}`
  if (tag.provider && tag.externalId) return `${tag.provider}:${tag.externalId}`
  return `text:${(tag.title || '').toLowerCase()}`
}

const SCRATCHPAD_TYPE_TO_SEARCH = {
  music: ['music'],
  movie: ['movie'],
  tv: ['tv'],
  book: ['book'],
}

const TYPE_ICONS = { music: Music, movie: Film, tv: Tv, book: BookOpen }

// ─── Tidbits generator ───
function generateTidbits(stats, profile, streak) {
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

  // Streak
  if (streak >= 4) {
    tidbits.push({ emoji: '🔥', text: `${streak} weeks straight of Liner Notes. Your dedication is lowkey inspiring and highkey obsessive. Keep going.` })
  } else if (streak === 0) {
    tidbits.push({ emoji: '📮', text: "Your Liner Notes are looking a little lonely this week. Even a one-liner counts." })
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
    { emoji: '🪩', text: "Hot take: your Liner Notes are the most interesting journal you'll ever keep. Write in them." },
    { emoji: '🧊', text: "Cold take: you have objectively great taste. We checked." },
    { emoji: '📱', text: "Quick — text a friend the last thing you 5-starred. They need to know." },
  ]
  tidbits.push(prompts[seed % prompts.length])

  // Return 2 tidbits max, deterministically selected
  const selected = tidbits.slice(0, 2)
  return selected
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
  const { items, getStats } = useCatalog()
  const { profile, isProfileEmpty } = useTasteProfile()
  const { radar, loading: radarLoading, isDemo: radarIsDemo } = useWeeklyRadar()
  const { dumps, getStreak, getCurrentWeekDump, saveDump } = useWeeklyDumps()
  const { notes, addNote, deleteNote } = useScratchpad()
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState('movie')
  const [noteMeta, setNoteMeta] = useState(null) // from picked search result

  const stats = getStats()
  const streak = getStreak()
  const currentDump = getCurrentWeekDump()

  // Inline editing of the current week's Liner Notes from the Dashboard.
  // Mirrors the Weekly page form, but compact. Auto-saves on each change.
  const blankLiner = { listening: [], watching: [], reading: [], discovered: [] }
  const [liner, setLiner] = useState(blankLiner)
  const linerHydrated = useRef(false)

  useEffect(() => {
    setLiner({
      listening: currentDump?.listening || [],
      watching: currentDump?.watching || [],
      reading: currentDump?.reading || [],
      discovered: currentDump?.discovered || [],
    })
    linerHydrated.current = true
    // Re-hydrate when the underlying dump changes (e.g. cross-device sync arrives)
  }, [currentDump?.weekId, currentDump?.updatedAt])

  const persistLiner = (next) => {
    setLiner(next)
    saveDump({ ...next, notes: currentDump?.notes || '' })
  }

  const addLinerTag = (section, value) => {
    const current = liner[section] || []
    const newKey = linerTagKey(value)
    if (current.some((t) => linerTagKey(t) === newKey)) return
    persistLiner({ ...liner, [section]: [...current, value] })
  }

  const removeLinerTag = (section, value) => {
    const removeKey = linerTagKey(value)
    persistLiner({ ...liner, [section]: liner[section].filter((v) => linerTagKey(v) !== removeKey) })
  }

  const recentItems = items.slice(0, 5)
  const tidbits = generateTidbits(stats, profile, streak)

  const letter = useMemo(() => {
    if (!radar) return null
    return generateWeeklyLetter(profile, radar)
  }, [profile, radar])

  // Build a teaser from the letter
  const radarTeaser = useMemo(() => {
    if (!letter || letter.sections.length === 0) return null
    // Grab the first sentence from the first section
    const first = letter.sections[0]
    const raw = first.body.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
    const firstSentence = raw.split(/\.\s/)[0] + '.'
    return { emoji: first.emoji, title: first.title, teaser: firstSentence }
  }, [letter])

  // Determine CTA
  let cta = { to: '/catalog', label: 'Add Something to Catalog', icon: Plus }
  if (isProfileEmpty()) {
    cta = { to: '/me?tab=taste', label: 'Build Your Taste Profile', icon: Sparkles }
  } else if (!currentDump) {
    cta = { to: '/weekly', label: "Write This Week's Liner Notes", icon: BookMarked }
  } else if (radar) {
    cta = { to: '/radar', label: 'Check Your Weekly Radar', icon: Radar }
  }

  const handleAddNote = () => {
    if (!noteText.trim()) return
    // If user picked a match from the search, save the enriched metadata.
    // Otherwise, save just the text with the selected type so the note still
    // knows whether it's a book / movie / etc.
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
      // Free text — keep whatever type the user has selected
      setNoteMeta(null)
      setNoteText(result.title)
    } else {
      setNoteMeta(result)
      setNoteText(result.title)
    }
  }

  return (
    <div>
      {/* ─── Hero Greeting ─── */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
          {getGreeting(user?.displayName)}
        </h1>
        <p className="text-text-secondary">Here's the vibe check on your media universe.</p>
      </div>

      {/* ─── Log Media (always-available primary entry point) ─── */}
      <Link
        to="/catalog?add=1"
        className="group w-full block mb-4 bg-gradient-to-r from-accent-primary to-accent-hover text-white rounded-2xl p-5 shadow-lg shadow-accent-primary/30 hover:shadow-xl hover:shadow-accent-primary/40 border border-white/10 transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Plus size={24} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base">Log Media</p>
            <p className="text-xs text-white/90 mt-0.5">Just watched, read, or listened to something? Capture it now.</p>
          </div>
          <ArrowRight size={18} className="opacity-80 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </Link>

      {/* Secondary contextual CTA */}
      {cta.to !== '/catalog' && (
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
      {cta.to === '/catalog' && <div className="mb-8" />}

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Cataloged', value: stats.total, icon: Library, to: '/catalog' },
          { label: 'Streak', value: streak, icon: TrendingUp, color: 'var(--color-accent-primary)', to: '/weekly' },
          { label: 'Avg Rating', value: stats.avgRating || '—', icon: Star, color: '#f59e0b' },
          { label: 'Finished', value: stats.byStatus.finished, icon: Sparkles, color: 'var(--color-accent-books)' },
        ].map(({ label, value, icon: Icon, color, to }) => {
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
                    // Clear any prior picked meta since type changed
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
                {/* Teaser */}
                {radarTeaser && (
                  <Link to="/radar" className="block p-3 bg-bg-tertiary rounded-xl hover:bg-bg-hover transition-colors">
                    <p className="text-sm text-text-secondary leading-relaxed italic">
                      "{radarTeaser.teaser}"
                    </p>
                    <p className="text-xs text-accent-primary mt-1.5">Read this week's full dispatch →</p>
                  </Link>
                )}
                {radar.newReleases.slice(0, 3).map((item, i) => {
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

          {/* The Liner Notes — inline editable, auto-saves to current week, shows on public profile */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-text-primary">Right Now</h2>
              <Link to="/weekly" className="text-xs text-accent-primary hover:underline flex items-center gap-1">
                Open Liner Notes <ArrowRight size={12} />
              </Link>
            </div>
            <p className="text-xs text-text-muted mb-4">What you're into this week. Updates here also show on your public profile.</p>
            <div className="space-y-4">
              {LINER_SECTIONS.map(({ key, label, icon: Icon, color, placeholder, preferredTypes }) => (
                <div key={key}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon size={13} style={{ color }} />
                    <span className="text-xs font-medium text-text-muted">{label}</span>
                    {liner[key].length > 0 && (
                      <span className="text-[10px] px-1.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                        {liner[key].length}
                      </span>
                    )}
                  </div>
                  <MediaSearchInput
                    tags={liner[key]}
                    onAdd={(val) => addLinerTag(key, val)}
                    onRemove={(val) => removeLinerTag(key, val)}
                    placeholder={placeholder}
                    color={color}
                    preferredTypes={preferredTypes}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recent Catalog ─── */}
      <div className="bg-bg-secondary border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">Recent in Catalog</h2>
          <Link to="/catalog" className="text-sm text-accent-primary hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {recentItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentItems.map((item) => {
              const color = getMediaColor(item.type)
              return (
                <Link to="/catalog" key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-tertiary hover:bg-bg-hover transition-colors">
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
            <Link to="/catalog" className="inline-flex items-center gap-1 text-sm text-accent-primary hover:underline">
              <Plus size={14} /> Add your first item
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
