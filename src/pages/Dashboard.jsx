import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Music, Film, Tv, BookOpen, Radar, Star, CalendarPlus, Plus, ArrowRight, SlidersHorizontal, Trophy, Library, MessageCircle, Users, X, Send, Flame, Check, Play } from 'lucide-react'
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
import InsightsHero from '../components/InsightsHero'
import QuickAdd from '../components/QuickAdd'
import CatalogSeeds from '../components/CatalogSeeds'
import { FriendsFeedShelf } from '../components/FriendsFeedRows'
import FriendItemLightbox from '../components/FriendItemLightbox'
import { useFriendsFeed } from '../hooks/useFriendsFeed'
import { usePopularItems } from '../hooks/usePopularItems'
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
  const salutation = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return { salutation, first }
}

export default function Dashboard() {
  const { user } = useAuth()
  const { items, getStats, addItem } = useCatalog()
  const { profile, isProfileEmpty, saveProfile } = useTasteProfile()
  const { radar, loading: radarLoading, isDemo: radarIsDemo } = useWeeklyRadar()
  const { notes, addNote, deleteNote } = useScratchpad()
  const friendsFeed = useFriendsFeed(6)
  const popular = usePopularItems()
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState('movie')
  const [noteMeta, setNoteMeta] = useState(null) // from picked search result
  const [friendDetailItem, setFriendDetailItem] = useState(null)

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
  const previewKey = (i) => `${i.type}:${(i.title || '').toLowerCase().trim()}`
  const radarPreview = useMemo(() => {
    if (!radar) return []
    // One pick per bucket, never the same title twice (the same work can
    // appear in multiple buckets via different editions).
    const seen = new Set()
    const picks = []
    const take = (bucket, arr) => {
      const item = (arr || []).find((i) => !seen.has(previewKey(i)))
      if (item) {
        seen.add(previewKey(item))
        picks.push({ bucket, item })
      }
    }
    take('New & Trending', radar.fresh)
    take('Hyped', radar.hyped)
    take("Critics' Darlings", radar.darlings)
    return picks
  }, [radar])

  // Only nudge profile-building when it's empty. (Radar link removed — Radar
  // shows up further down anyway.)
  const showBuildProfile = isProfileEmpty()

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

  const inCatalog = (title, type) =>
    items.some(
      (i) => i.type === type && i.title.trim().toLowerCase() === String(title).trim().toLowerCase()
    )

  const radarCard = (
    <>
{/* Radar preview — one pick from each bucket */}
<div className="ink-card bg-bg-secondary rounded-2xl p-5">
  <div className="flex items-center justify-between mb-1">
    <h2 className="font-semibold text-text-primary">Weekly Radar</h2>
    <Link to="/radar" className="text-sm text-accent-primary hover:underline flex items-center gap-1">
      See all picks <ArrowRight size={14} />
    </Link>
  </div>
  <p className="text-xs text-text-muted mb-3">New & Trending · Hyped · Critics' Darlings.</p>
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
    </>
  )

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
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2.5px] text-text-muted mb-1.5">
          <span className="w-6 h-[3px] rounded-full bg-accent-primary inline-block" aria-hidden="true" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        {(() => {
          const { salutation, first } = getGreeting(user?.displayName)
          return (
            <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-2 tracking-tight">
              {salutation}, <span className="text-accent-primary">{first}.</span>
            </h1>
          )
        })()}
        <p className="text-text-secondary">The latest in your media consumption quest.</p>
      </div>

      {/* ─── Insights — front and center + shareable ─── */}
      <InsightsHero items={items} stats={{ total: stats.total, addedThisWeek, avgRating: stats.avgRating }} />

      {/* ─── Quick Add ─── */}
      <div className="mb-6">
        <QuickAdd addItem={addItem} />
      </div>

      {/* ─── Jump back in — the #1 reason to open a tracker ─── */}
      {items.some((i) => i.status === 'watching') && (
        <div className="ink-card bg-bg-secondary rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Play size={18} className="text-accent-tv" />
              <h2 className="font-semibold text-text-primary">Jump back in</h2>
            </div>
            <Link to="/catalog" className="text-sm text-accent-primary hover:underline flex items-center gap-1">
              Catalog <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex gap-3">
            {items.filter((i) => i.status === 'watching').slice(0, 4).map((it) => (
              <Link key={it.id} to="/catalog" className="shrink-0 w-20" title={it.title}>
                <CoverArt title={it.title} type={it.type} creator={it.creator} coverUrl={it.coverUrl} size="md" />
                <p className="text-[10px] text-text-muted truncate mt-1">{it.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ─── Catalog seeds — activation for (nearly) empty catalogs ─── */}
      {items.length < 3 && <CatalogSeeds profile={profile} addItem={addItem} />}

      {/* Build-profile nudge (only when empty) */}
      {showBuildProfile && (
        <div className="mb-8">
          <Link
            to="/me?tab=taste"
            className="inline-flex items-center gap-2 text-sm text-accent-primary hover:underline"
          >
            <SlidersHorizontal size={14} />
            Build Your Taste Profile
          </Link>
        </div>
      )}
      {!showBuildProfile && <div className="mb-2" />}

      {/* Weekly Radar first on mobile — it lives in the right column on desktop */}
      <div className="lg:hidden mb-6">{radarCard}</div>

      {/* ─── Main Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Left column */}
        <div className="space-y-6">
          {/* Scratchpad */}
          <div className="ink-card bg-bg-secondary rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={18} className="text-accent-primary" />
              <h2 className="font-semibold text-text-primary">Someone Told Me About...</h2>
            </div>
            <p className="text-xs text-text-muted mb-3">Your parking lot for when you are vetting recommendations to add to your log.</p>

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
                    <div
                      key={note.id}
                      className={`flex items-center gap-3 group p-2 rounded-lg hover:bg-bg-tertiary transition-colors ${note.type ? 'cursor-pointer' : ''}`}
                      onClick={note.type ? () => setFriendDetailItem({
                        title: note.text,
                        creator: note.creator || '',
                        type: note.type,
                        year: note.year || '',
                        coverUrl: note.coverUrl || '',
                        sourceLabel: 'From your scratchpad',
                        noteId: note.id,
                      }) : undefined}
                    >
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
                      {note.type && (
                        inCatalog(note.text, note.type) ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-books shrink-0" title="Already in your log">
                            <Check size={12} />
                            Saved
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addItem({
                                title: note.text,
                                creator: note.creator || '',
                                type: note.type,
                                year: note.year || '',
                                coverUrl: note.coverUrl || '',
                                status: 'want',
                              })
                              deleteNote(note.id)
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent-primary text-white hover:bg-accent-hover transition-colors shrink-0"
                            title="Move to your log (Want to Try)"
                          >
                            <Plus size={12} />
                            Add
                          </button>
                        )
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                        className="p-1 rounded text-text-muted/0 group-hover:text-text-muted hover:text-accent-movies transition-colors shrink-0"
                        title="Not interested, remove"
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

          {/* Fresh from friends — latest adds/finishes from people you follow */}
          <div className="ink-card bg-bg-secondary rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-accent-primary" />
                <h2 className="font-semibold text-text-primary">Fresh from friends</h2>
              </div>
              <Link to="/friends" className="text-sm text-accent-primary hover:underline flex items-center gap-1">
                See all <ArrowRight size={14} />
              </Link>
            </div>
            <p className="text-xs text-text-muted mb-2">Tap anything to check it out.</p>
            {friendsFeed.items.length > 0 ? (
              <FriendsFeedShelf
                items={friendsFeed.items}
                onItemClick={(it) => setFriendDetailItem({ ...it, friendName: it.displayName })}
              />
            ) : (
              <p className="text-xs text-text-muted italic text-center py-4">
                {friendsFeed.hasFriends
                  ? 'Nothing from your friends yet. Check back soon.'
                  : 'Follow some friends and their latest picks show up here.'}
              </p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Radar preview — rendered from radarCard (mobile + desktop slots) */}
          <div className="hidden lg:block">{radarCard}</div>

          {/* Popular with Users — anonymous aggregate of what people are adding */}
          {popular.items.length > 0 && (
            <div className="ink-card bg-bg-secondary rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Flame size={18} className="text-accent-primary" />
                <h2 className="font-semibold text-text-primary">Popular with Users</h2>
              </div>
              <p className="text-xs text-text-muted mb-3">What multiple people cataloged lately.</p>
              <div className="space-y-2">
                {popular.items.map((item) => {
                  const owned = inCatalog(item.title, item.type)
                  return (
                    <div key={`${item.type}-${item.title}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors">
                      <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                        <p className="text-xs text-text-muted truncate">
                          {item.creator ? `${item.creator} · ` : ''}
                          <span style={{ color: getMediaColor(item.type) }}>{item.userCount} people logged this</span>
                        </p>
                      </div>
                      {owned ? (
                        <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-accent-books">
                          <Check size={13} /> In catalog
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            addItem({
                              title: item.title,
                              creator: item.creator,
                              type: item.type,
                              coverUrl: item.coverUrl,
                              status: 'want',
                            })
                          }
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                        >
                          <Plus size={13} /> Add
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent in Catalog */}
          <div className="ink-card bg-bg-secondary rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-text-primary">Recently Logged</h2>
              <Link to="/catalog" className="text-sm text-accent-primary hover:underline flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {recentItems.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                {recentItems.map((item) => {
                  return (
                    <Link to="/catalog" key={item.id} className="w-24 shrink-0 group" title={item.title}>
                      <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="md" />
                      <p className="text-xs font-medium text-text-primary truncate mt-1.5">{item.title}</p>
                      {item.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-500">
                          <Star size={9} fill="currentColor" />
                          {item.rating}
                        </span>
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
      <FriendItemLightbox
        item={friendDetailItem}
        isOpen={!!friendDetailItem}
        onClose={() => setFriendDetailItem(null)}
        addItem={addItem}
        inCatalog={inCatalog}
        onAdded={(it) => { if (it.noteId) deleteNote(it.noteId) }}
      />
    </div>
  )
}
