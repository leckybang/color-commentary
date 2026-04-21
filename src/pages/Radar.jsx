import { useState } from 'react'
import { Radar as RadarIcon, Sparkles, Calendar, Loader2, RefreshCw, ChevronDown, ChevronUp, Check, Bookmark, Mail, Info, Music, Film, Tv, BookOpen } from 'lucide-react'
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

  return (
    <div
      className={`bg-bg-secondary border rounded-xl transition-all ${
        expanded ? 'border-accent-primary/30 shadow-lg shadow-accent-primary/5' : 'border-border hover:border-accent-primary/15'
      }`}
    >
      {/* Collapsed header */}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3">
          <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="radar" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary text-sm">{item.title}</h3>
            <p className="text-xs text-text-secondary mt-0.5">{item.creator}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
              >
                {TYPE_LABELS[item.type]}
              </span>
              {item.genre && <span className="text-xs text-text-muted">{item.genre}</span>}
            </div>
          </div>
          <div className="shrink-0 text-text-muted mt-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {!expanded && item.description && (
          <p className="text-xs text-text-muted mt-2 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        {!expanded && item.releaseDate && (
          <div className="flex items-center gap-1 mt-2 text-xs text-text-muted">
            <Calendar size={12} />
            {formatDate(item.releaseDate)}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {item.description && (
            <p className="text-sm text-text-secondary leading-relaxed">{item.description}</p>
          )}
          {item.releaseDate && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Calendar size={13} />
              <span>Releases {formatDate(item.releaseDate)}</span>
            </div>
          )}
          {item.reason && (
            <div className="flex items-center gap-1.5 text-xs">
              <Sparkles size={12} className="text-accent-primary shrink-0" />
              <span className="text-accent-primary/80">{item.reason}</span>
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
  const [activeTab, setActiveTab] = useState('releases')
  const [letterOpen, setLetterOpen] = useState(true)

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

  const visibleReleases = (radar?.newReleases || []).filter((r) => !dismissed.has(r.title))
  const visibleDiscoveries = (radar?.discoveries || []).filter((d) => !dismissed.has(d.title))

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
              : 'New releases and discoveries based on your tastes'}
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

      {/* Demo-mode caveat */}
      {isDemo && (
        <div className="mb-6 flex items-start gap-2 p-3 bg-accent-primary/5 border border-accent-primary/20 rounded-xl">
          <Info size={16} className="text-accent-primary mt-0.5 shrink-0" />
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="font-medium text-accent-primary">Affectionately fictional.</span>{' '}
            Demo Weekly Radar uses parody titles and made-up release dates. Sign in to swap this for real new releases from Spotify, TMDB, and OpenLibrary.
          </p>
        </div>
      )}

      {/* Loading state */}
      {!isDemo && loading && !radar && (
        <div className="mb-6 flex items-center gap-2 text-sm text-text-muted">
          <Loader2 size={14} className="animate-spin" />
          Pulling this week's releases from Spotify, TMDB, and OpenLibrary…
        </div>
      )}

      {/* Error state */}
      {!isDemo && error && (
        <div className="mb-6 flex items-start gap-2 p-3 bg-accent-movies/5 border border-accent-movies/20 rounded-xl">
          <Info size={16} className="text-accent-movies mt-0.5 shrink-0" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Couldn't reach one of the media APIs. Try refreshing in a minute.
          </p>
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
                  {/* Header */}
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

                  {/* Paragraphs */}
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

                  {/* Featured items — find them on */}
                  {(letter.featuredTitles || []).length > 0 && (() => {
                    const allRadarItems = [...(radar?.newReleases || []), ...(radar?.discoveries || [])]
                    const matched = (letter.featuredTitles || []).flatMap((title) => {
                      const t = title.toLowerCase()
                      const found = allRadarItems.find(
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

                  {/* Closing */}
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('releases')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'releases'
              ? 'bg-accent-primary/15 text-accent-primary'
              : 'text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <Calendar size={16} />
          Notable Releases ({visibleReleases.length})
        </button>
        <button
          onClick={() => setActiveTab('discoveries')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'discoveries'
              ? 'bg-accent-primary/15 text-accent-primary'
              : 'text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <Sparkles size={16} />
          Discoveries ({visibleDiscoveries.length})
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'releases' && (
        <div>
          {visibleReleases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleReleases.map((item, i) => (
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
              <Calendar size={32} className="mx-auto text-text-muted/30 mb-3" />
              <p className="text-text-secondary">
                {loading ? "Loading this week's releases…" : 'No new releases this week. Check back soon!'}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'discoveries' && (
        <div>
          <p className="text-sm text-text-muted mb-4">
            Based on your taste profile, you might enjoy these artists and titles you haven't cataloged yet.
          </p>
          {visibleDiscoveries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleDiscoveries.map((item, i) => (
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
              <Sparkles size={32} className="mx-auto text-text-muted/30 mb-3" />
              <p className="text-text-secondary">No more discoveries right now. Refresh or update your profile!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
