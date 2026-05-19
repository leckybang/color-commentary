import { useState, useMemo } from 'react'
import { Radar as RadarIcon, Sparkles, Calendar, Loader2, RefreshCw, ChevronDown, ChevronUp, Check, Bookmark, Mail, Info, Music, Film, Tv, BookOpen, Newspaper } from 'lucide-react'
import CoverArt from '../components/common/CoverArt'
import ExternalLinks from '../components/common/ExternalLinks'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { useCatalog } from '../hooks/useCatalog'
import { useWeeklyRadar } from '../hooks/useWeeklyRadar'
import { useWeeklyLetter } from '../hooks/useWeeklyLetter'
import { useAuth } from '../hooks/useAuth'
import { getMediaColor } from '../utils/filterUtils'
import { formatDate } from '../utils/dateUtils'

const TYPE_ICONS = { music: Music, movie: Film, tv: Tv, book: BookOpen }
const TYPE_LABELS = { music: 'Music', movie: 'Movie', tv: 'TV', book: 'Book' }

function RadarCard({ item, onAdd, onDismiss, isAdded }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TYPE_ICONS[item.type] || Music
  const color = getMediaColor(item.type)
  const isTastemaker = !!item.isTastemaker
  const hasReleaseDate = !!item.releaseDate

  return (
    <div
      className={`bg-bg-secondary border rounded-xl transition-all ${
        expanded ? 'border-accent-primary/30 shadow-lg shadow-accent-primary/5' : 'border-border hover:border-accent-primary/15'
      }`}
    >
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3">
          <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="radar" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary text-sm">{item.title}</h3>
            <p className="text-xs text-text-secondary mt-0.5">{item.creator}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
              >
                {TYPE_LABELS[item.type]}
              </span>
              {isTastemaker && item.source && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-accent-primary/15 text-accent-primary flex items-center gap-1">
                  <Newspaper size={10} />
                  {item.source}
                </span>
              )}
              {!isTastemaker && hasReleaseDate && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-bg-tertiary text-text-muted flex items-center gap-1">
                  <Calendar size={10} />
                  {formatDate(item.releaseDate)}
                </span>
              )}
              {item.genre && <span className="text-xs text-text-muted">{item.genre}</span>}
            </div>
          </div>
          <div className="shrink-0 text-text-muted mt-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {!expanded && (item.blurb || item.description) && (
          <p className="text-xs text-text-muted mt-2 line-clamp-2 leading-relaxed">{item.blurb || item.description}</p>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {(item.blurb || item.description) && (
            <p className="text-sm text-text-secondary leading-relaxed">{item.blurb || item.description}</p>
          )}
          {item.releaseDate && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Calendar size={13} />
              <span>Releases {formatDate(item.releaseDate)}</span>
            </div>
          )}
          {item.reason && (
            <div className="flex items-start gap-1.5 text-xs">
              <Sparkles size={12} className="text-accent-primary shrink-0 mt-0.5" />
              <span className="text-accent-primary/80 leading-relaxed">{item.reason}</span>
            </div>
          )}
          <ExternalLinks type={item.type} title={item.title} creator={item.creator} />
          <div className="flex gap-2 pt-2 border-t border-border">
            {isAdded ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-accent-books">
                <Check size={14} />
                Added to Catalog
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(item) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
              >
                <Bookmark size={14} />
                Want to Check Out
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(item) }}
              className="px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Not for me
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const FILTER_TABS = [
  { value: 'all',   label: 'All',         icon: Sparkles },
  { value: 'buzz',  label: 'Tastemakers', icon: Newspaper },
  { value: 'new',   label: 'New Releases',icon: Calendar },
  { value: 'music', label: 'Music',       icon: Music },
  { value: 'movie', label: 'Movies',      icon: Film },
  { value: 'tv',    label: 'TV',          icon: Tv },
  { value: 'book',  label: 'Books',       icon: BookOpen },
]

export default function Radar() {
  const { user } = useAuth()
  const { profile, isProfileEmpty } = useTasteProfile()
  const { items: catalogItems, addItem } = useCatalog()
  const { radar, loading, error, refresh: refreshRadar, isDemo } = useWeeklyRadar()
  const { letter, letterLoading, refreshLetter } = useWeeklyLetter({
    user,
    isDemo,
    profile,
    catalogItems,
    radar,
  })

  const [dismissed, setDismissed] = useState(new Set())
  const [addedItems, setAddedItems] = useState(new Set())
  const [activeFilter, setActiveFilter] = useState('all')
  const [letterOpen, setLetterOpen] = useState(true)
  const [signalsOpen, setSignalsOpen] = useState(false)

  const handleRefresh = () => {
    refreshRadar()
    refreshLetter()
  }

  const handleAdd = (item) => {
    addItem({ title: item.title, creator: item.creator, type: item.type, genre: item.genre || '', status: 'want' })
    setAddedItems((prev) => new Set([...prev, item.title]))
  }

  const handleDismiss = (item) => {
    setDismissed((prev) => new Set([...prev, item.title]))
  }

  // What's actually feeding the recommendations — surfaced so it's clear the
  // Dashboard Taste Check picks (which write into this same profile) matter.
  const tasteSignals = useMemo(() => {
    const p = profile || {}
    const groups = [
      { label: 'Artists', values: p.music?.artists || [] },
      { label: 'Directors', values: p.movies?.directors || [] },
      { label: 'Actors', values: p.movies?.actors || [] },
      { label: 'Shows', values: p.tv?.shows || [] },
      { label: 'Authors', values: p.books?.authors || [] },
      {
        label: 'Genres',
        values: [
          ...(p.music?.genres || []),
          ...(p.movies?.genres || []),
          ...(p.tv?.genres || []),
          ...(p.books?.genres || []),
        ],
      },
    ]
    const flat = groups.flatMap((g) => g.values)
    return { groups: groups.filter((g) => g.values.length > 0), total: flat.length }
  }, [profile])

  // Unified feed: radar.picks if present, else fall back to legacy newReleases + discoveries.
  const allPicks = useMemo(() => {
    if (!radar) return []
    if (Array.isArray(radar.picks) && radar.picks.length > 0) return radar.picks
    return [...(radar.newReleases || []), ...(radar.discoveries || [])]
  }, [radar])

  const filteredPicks = useMemo(() => {
    const visible = allPicks.filter((r) => !dismissed.has(r.title))
    switch (activeFilter) {
      case 'buzz':  return visible.filter((r) => r.isTastemaker)
      case 'new':   return visible.filter((r) => r.releaseDate && !r.isTastemaker)
      case 'music': return visible.filter((r) => r.type === 'music')
      case 'movie': return visible.filter((r) => r.type === 'movie')
      case 'tv':    return visible.filter((r) => r.type === 'tv')
      case 'book':  return visible.filter((r) => r.type === 'book')
      default:      return visible
    }
  }, [allPicks, dismissed, activeFilter])

  const tabCounts = useMemo(() => {
    const visible = allPicks.filter((r) => !dismissed.has(r.title))
    return {
      all:   visible.length,
      buzz:  visible.filter((r) => r.isTastemaker).length,
      new:   visible.filter((r) => r.releaseDate && !r.isTastemaker).length,
      music: visible.filter((r) => r.type === 'music').length,
      movie: visible.filter((r) => r.type === 'movie').length,
      tv:    visible.filter((r) => r.type === 'tv').length,
      book:  visible.filter((r) => r.type === 'book').length,
    }
  }, [allPicks, dismissed])

  if (isProfileEmpty()) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Weekly Radar</h1>
        <div className="text-center py-16 bg-bg-secondary border border-border rounded-2xl">
          <RadarIcon size={48} className="mx-auto text-text-muted/30 mb-4" />
          <h3 className="text-lg font-medium text-text-secondary mb-2">Set up your taste profile first</h3>
          <p className="text-text-muted text-sm mb-4">
            Tell us your favorite artists, directors, and authors to get personalized recommendations.
          </p>
          <a
            href="/profile"
            className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Build Your Profile
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Weekly Radar</h1>
          <p className="text-text-secondary text-sm">
            {isDemo
              ? 'A sample dispatch — fictional picks, real vibes.'
              : 'New releases and tastemaker buzz, curated to your taste.'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || letterLoading}
          className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
        >
          {loading || letterLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {loading || letterLoading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {isDemo && (
        <div className="mb-6 flex items-start gap-2 p-3 bg-accent-primary/5 border border-accent-primary/20 rounded-xl">
          <Info size={16} className="text-accent-primary mt-0.5 shrink-0" />
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="font-medium text-accent-primary">Affectionately fictional.</span>{' '}
            Demo Weekly Radar uses parody titles. Sign in for real new releases plus tastemaker buzz from NYT Books, Pitchfork, The Cut, LitHub, Rotten Tomatoes, and more.
          </p>
        </div>
      )}

      {!isDemo && loading && !radar && (
        <div className="mb-6 flex items-center gap-2 text-sm text-text-muted">
          <Loader2 size={14} className="animate-spin" />
          Pulling this week's releases and tastemaker buzz…
        </div>
      )}

      {!isDemo && error && (
        <div className="mb-6 flex items-start gap-2 p-3 bg-accent-movies/5 border border-accent-movies/20 rounded-xl">
          <Info size={16} className="text-accent-movies mt-0.5 shrink-0" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Couldn't reach one of the sources. Try refreshing in a minute.
          </p>
        </div>
      )}

      {/* Tuned to your taste — makes it clear the profile + Taste Check picks drive this */}
      {!isDemo && tasteSignals.total > 0 && (
        <div className="mb-6 bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setSignalsOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-bg-hover/30 transition-colors"
          >
            <div className="flex items-center gap-2 text-left">
              <Sparkles size={15} className="text-accent-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">Tuned to your taste</p>
                <p className="text-xs text-text-muted">
                  {tasteSignals.total} signals are shaping these picks — including your Taste Check answers.
                </p>
              </div>
            </div>
            {signalsOpen ? <ChevronUp size={16} className="text-text-muted shrink-0" /> : <ChevronDown size={16} className="text-text-muted shrink-0" />}
          </button>
          {signalsOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              {tasteSignals.groups.map((g) => (
                <div key={g.label}>
                  <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1.5">{g.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.values.slice(0, 14).map((v) => (
                      <span
                        key={v}
                        className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary border border-border"
                      >
                        {v}
                      </span>
                    ))}
                    {g.values.length > 14 && (
                      <span className="text-xs px-2 py-0.5 text-text-muted">+{g.values.length - 14} more</span>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-text-muted pt-1">
                Add more on the Dashboard <span className="text-text-secondary">Taste Check</span>, or edit them in{' '}
                <a href="/me?tab=taste" className="text-accent-primary hover:underline">your profile</a>.
                Changes apply on the next refresh.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Weekly Letter */}
      {(letter || letterLoading) && (
        <div className="mb-6">
          <button
            onClick={() => setLetterOpen(!letterOpen)}
            className="flex items-center gap-2 text-sm font-medium text-accent-primary hover:text-accent-hover transition-colors mb-3"
          >
            <Mail size={15} />
            {letterOpen ? 'Hide' : 'Read'} This Week's Letter
            {letterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {letterOpen && (
            <div className="bg-bg-secondary border border-border rounded-2xl p-6 md:p-8 space-y-4">
              {letterLoading && !letter ? (
                <div className="flex items-center gap-2 py-4 text-sm text-text-muted">
                  <Loader2 size={14} className="animate-spin" />
                  Composing your weekly dispatch…
                </div>
              ) : letter ? (
                <>
                  <div className="border-b border-border pb-4">
                    <p className="text-xs font-medium text-text-muted tracking-widest uppercase mb-1">
                      The Weekly Radar{letter.weekLabel ? ` — ${letter.weekLabel}` : ''}
                    </p>
                    <p
                      className="text-lg md:text-xl font-bold text-text-primary"
                      style={{ fontFamily: "'Libre Baskerville', serif" }}
                    >
                      {letter.greeting}
                    </p>
                  </div>

                  {(letter.paragraphs || []).map((para, i) => (
                    <p
                      key={i}
                      className="text-text-secondary leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: para
                          .replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--color-text-primary)">$1</strong>')
                          .replace(/\*(.+?)\*/g, '<em>$1</em>'),
                      }}
                    />
                  ))}

                  {(letter.featuredTitles || []).length > 0 && (() => {
                    const matched = (letter.featuredTitles || []).flatMap((title) => {
                      const t = title.toLowerCase()
                      const found = allPicks.find(
                        (r) => r.title.toLowerCase() === t ||
                               r.title.toLowerCase().includes(t) ||
                               t.includes(r.title.toLowerCase())
                      )
                      return found ? [found] : []
                    })
                    if (!matched.length) return null
                    return (
                      <div className="border-t border-border pt-4 space-y-3">
                        <p className="text-xs font-medium text-text-muted tracking-wide uppercase">
                          Find this week's picks
                        </p>
                        {matched.map((item, i) => (
                          <div key={i} className="space-y-1.5">
                            <p className="text-xs font-medium text-text-secondary">{item.title}</p>
                            <ExternalLinks type={item.type} title={item.title} creator={item.creator || ''} />
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  <div className="border-t border-border pt-4 mt-4">
                    <p className="text-text-secondary text-sm italic">{letter.closing}</p>
                    <p
                      className="text-text-muted text-xs mt-2"
                      style={{ fontFamily: "'Libre Baskerville', serif" }}
                    >
                      {letter.signoff || '— Your Color Commentary Radar'}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Filter tabs — segments the unified picks feed */}
      <div className="flex gap-2 mb-6 overflow-x-auto -mx-1 px-1 pb-1">
        {FILTER_TABS.map((tab) => {
          const { value, label } = tab
          const Icon = tab.icon
          const count = tabCounts[value] ?? 0
          const isActive = activeFilter === value
          if (count === 0 && value !== 'all') return null
          return (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-accent-primary/15 text-accent-primary'
                  : 'text-text-secondary hover:bg-bg-hover border border-border'
              }`}
            >
              <Icon size={14} />
              {label}
              <span className={`text-[10px] px-1.5 rounded-full ${isActive ? 'bg-accent-primary/25 text-accent-primary' : 'bg-bg-tertiary text-text-muted'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Unified feed */}
      {filteredPicks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPicks.map((item, i) => (
            <RadarCard
              key={`${item.title}-${i}`}
              item={item}
              onAdd={handleAdd}
              onDismiss={handleDismiss}
              isAdded={addedItems.has(item.title)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-bg-secondary border border-border rounded-2xl">
          <RadarIcon size={32} className="mx-auto text-text-muted/30 mb-3" />
          <p className="text-text-secondary">
            {loading ? "Loading this week's radar…" : activeFilter === 'all' ? 'Nothing on the radar right now. Try refreshing.' : 'No picks match that filter.'}
          </p>
        </div>
      )}
    </div>
  )
}
