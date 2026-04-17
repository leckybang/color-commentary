import { useState, useMemo } from 'react'
import { Radar as RadarIcon, Sparkles, Calendar, Plus, X, Music, Film, Tv, BookOpen, RefreshCw, ChevronDown, ChevronUp, Check, User, Bookmark, Mail } from 'lucide-react'
import CoverArt from '../components/common/CoverArt'
import ExternalLinks from '../components/common/ExternalLinks'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { useCatalog } from '../hooks/useCatalog'
import { getWeeklyRadar } from '../services/mockData'
import { getMediaColor } from '../utils/filterUtils'
import { formatDate } from '../utils/dateUtils'
import { generateWeeklyLetter } from '../utils/weeklyLetter'

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
      {/* Collapsed header — always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
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
          {/* Description */}
          {item.description && (
            <p className="text-sm text-text-secondary leading-relaxed">{item.description}</p>
          )}

          {/* Release date */}
          {item.releaseDate && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Calendar size={13} />
              <span>Releases {formatDate(item.releaseDate)}</span>
            </div>
          )}

          {/* Creator note */}
          {item.creatorNote && (
            <div className="flex items-start gap-2 bg-bg-tertiary rounded-lg p-3">
              <User size={14} className="text-text-muted mt-0.5 shrink-0" />
              <p className="text-xs text-text-secondary italic leading-relaxed">{item.creatorNote}</p>
            </div>
          )}

          {/* Related works */}
          {item.relatedWorks && item.relatedWorks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted mb-1.5">Also by {item.creator}:</p>
              <div className="flex flex-wrap gap-1.5">
                {item.relatedWorks.map((work) => (
                  <span key={work} className="text-xs px-2.5 py-1 rounded-full bg-bg-tertiary text-text-secondary">
                    {work}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Why this? (discoveries) */}
          {item.reason && (
            <div className="flex items-center gap-1.5 text-xs">
              <Sparkles size={12} className="text-accent-primary shrink-0" />
              <span className="text-accent-primary/80">{item.reason}</span>
            </div>
          )}

          {/* External links */}
          <ExternalLinks type={item.type} title={item.title} creator={item.creator} />

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border">
            {isAdded ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-accent-books">
                <Check size={14} />
                Added to Catalog
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(item); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
              >
                <Bookmark size={14} />
                Want to Check Out
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(item); }}
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
  const { profile, isProfileEmpty } = useTasteProfile()
  const { items: catalogItems, addItem } = useCatalog()
  const [dismissed, setDismissed] = useState(new Set())
  const [addedItems, setAddedItems] = useState(new Set())
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState('releases')
  const [letterOpen, setLetterOpen] = useState(true)

  const radar = useMemo(() => {
    return getWeeklyRadar(profile, catalogItems)
  }, [profile, catalogItems, refreshKey])

  const letter = useMemo(() => {
    if (isProfileEmpty()) return null
    return generateWeeklyLetter(profile, radar)
  }, [profile, radar])

  const handleAdd = (item) => {
    addItem({
      title: item.title,
      creator: item.creator,
      type: item.type,
      genre: item.genre || '',
      status: 'want',
    })
    setAddedItems((prev) => new Set([...prev, item.title]))
  }

  const handleDismiss = (item) => {
    setDismissed((prev) => new Set([...prev, item.title]))
  }

  const visibleReleases = radar.newReleases.filter((r) => !dismissed.has(r.title))
  const visibleDiscoveries = radar.discoveries.filter((d) => !dismissed.has(d.title))

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
          <p className="text-text-secondary text-sm">New releases and discoveries based on your tastes</p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Weekly Letter */}
      {letter && (
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
              {/* Header */}
              <div className="border-b border-border pb-4">
                <p className="text-xs font-medium text-text-muted tracking-widest uppercase mb-1">
                  The Weekly Radar — {letter.weekLabel}
                </p>
                <p className="text-lg md:text-xl font-bold text-text-primary" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  {letter.greeting}
                </p>
              </div>

              {/* Intro */}
              <p className="text-text-secondary leading-relaxed">{letter.intro}</p>

              {/* Sections */}
              {letter.sections.map((section, i) => (
                <div key={i} className="space-y-2">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                    <span>{section.emoji}</span>
                    {section.title}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: section.body
                        .replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--color-text-primary)">$1</strong>')
                        .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    }}
                  />
                </div>
              ))}

              {/* Closing */}
              <div className="border-t border-border pt-4 mt-4">
                <p className="text-text-secondary text-sm italic">{letter.closing}</p>
                <p className="text-text-muted text-xs mt-2" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  {letter.signoff}
                </p>
              </div>
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
          New Releases ({visibleReleases.length})
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

      {/* Content */}
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
              <p className="text-text-secondary">No new releases this week. Check back soon!</p>
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
