import { useState, useMemo } from 'react'
import { Radar as RadarIcon, BadgeCheck, Calendar, Loader2, RefreshCw, ChevronDown, ChevronUp, Check, Bookmark, Info, Music, Film, Tv, BookOpen, Newspaper, ExternalLink, TrendingUp, Award, Users, Zap, Flame } from 'lucide-react'
import CoverArt from '../components/common/CoverArt'
import FriendItemLightbox from '../components/FriendItemLightbox'
import { usePopularItems } from '../hooks/usePopularItems'
import ExternalLinks from '../components/common/ExternalLinks'
import { useCatalog } from '../hooks/useCatalog'
import { useWeeklyRadar } from '../hooks/useWeeklyRadar'
import { getMediaColor } from '../utils/filterUtils'
import { formatDate } from '../utils/dateUtils'

const TYPE_LABELS = { music: 'Music', movie: 'Movie', tv: 'TV', book: 'Book' }

// Map a free-text source ("Pitchfork — Best New Music", "NYT Best Seller #1")
// to the publication + a site-scoped search that reliably lands on the
// actual review. We deliberately don't trust an LLM-supplied URL (those
// hallucinate / 404); a publication-scoped search always resolves.
const SOURCE_SITES = [
  { re: /lit\s*hub|bookmarks/i, name: 'LitHub', domain: 'lithub.com' },
  { re: /pitchfork/i, name: 'Pitchfork', domain: 'pitchfork.com' },
  { re: /rotten\s*tomatoes/i, name: 'Rotten Tomatoes', domain: 'rottentomatoes.com' },
  { re: /n\.?\s*y\.?\s*t|new york times/i, name: 'NYT', domain: 'nytimes.com' },
  { re: /the cut/i, name: 'The Cut', domain: 'thecut.com' },
  { re: /vulture/i, name: 'Vulture', domain: 'vulture.com' },
  { re: /new yorker/i, name: 'The New Yorker', domain: 'newyorker.com' },
  { re: /atlantic/i, name: 'The Atlantic', domain: 'theatlantic.com' },
]

function reviewLink(item) {
  if (!item?.source || !item?.title) return null
  // "New on Spotify" is a release announcement, not a review — there's
  // nothing to read, and the Spotify/Apple Music buttons already link out.
  if (/new on spotify/i.test(item.source)) return null
  if (item.reviewUrl) {
    const hit0 = SOURCE_SITES.find((s) => s.re.test(item.source))
    return { label: hit0?.name || item.source.split(/[—–-]/)[0].trim(), url: item.reviewUrl }
  }
  const hit = SOURCE_SITES.find((s) => s.re.test(item.source))
  if (hit?.domain === 'rottentomatoes.com' || (!hit && (item.type === 'movie' || item.type === 'tv'))) {
    return { label: 'Rotten Tomatoes', url: `https://www.rottentomatoes.com/search?search=${encodeURIComponent(item.title)}` }
  }
  const base = `${item.title} ${item.creator || ''} review`.trim()
  const query = hit ? `${base} site:${hit.domain}` : `${base} ${item.source}`
  const label = hit?.name || item.source.split(/[—–-]/)[0].trim()
  return { label, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` }
}

const BUCKETS = [
  {
    key: 'fresh',
    label: 'New & Trending',
    icon: Zap,
    color: 'var(--color-accent-movies)',
    blurb: 'Just dropped: this week\'s releases and brand-new list arrivals.',
  },
  {
    key: 'hyped',
    label: 'Hyped',
    icon: TrendingUp,
    color: 'var(--color-accent-primary)',
    blurb: 'Popular new releases critics also love.',
  },
  {
    key: 'darlings',
    label: "Critics' Darlings",
    icon: Award,
    color: 'var(--color-accent-books)',
    blurb: 'Quietly raved picks from NYT Books, Pitchfork, and top-scored screen.',
  },
]

function RadarCard({ item, onAdd, onDismiss, isAdded }) {
  const [expanded, setExpanded] = useState(false)
  const color = getMediaColor(item.type)
  const review = reviewLink(item)

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
              {item.source && (
                review ? (
                  <a
                    href={review.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25 transition-colors flex items-center gap-1"
                    title={`Read the ${review.label} review`}
                  >
                    <Newspaper size={10} />
                    {item.source}
                    <ExternalLink size={9} />
                  </a>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-accent-primary/15 text-accent-primary flex items-center gap-1">
                    <Newspaper size={10} />
                    {item.source}
                  </span>
                )
              )}
              {item.releaseDate && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-bg-tertiary text-text-muted flex items-center gap-1">
                  <Calendar size={10} />
                  {formatDate(item.releaseDate)}
                </span>
              )}
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
          {Array.isArray(item.cast) && item.cast.length > 0 && (
            <div className="flex items-start gap-1.5 text-xs text-text-muted">
              <Users size={12} className="shrink-0 mt-0.5" />
              <span><span className="text-text-secondary">Starring</span> {item.cast.join(', ')}</span>
            </div>
          )}
          {review && (
            <a
              href={review.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-primary hover:underline"
            >
              <Newspaper size={13} />
              Read the {review.label} review
              <ExternalLink size={11} />
            </a>
          )}
          <ExternalLinks type={item.type} title={item.title} creator={item.creator} />
          <div className="flex gap-2 pt-2 border-t border-border">
            {isAdded ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-accent-books">
                <Check size={14} />
                Logged
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

function BucketSection({ bucket, items, onAdd, onDismiss, addedItems }) {
  const Icon = bucket.icon
  if (!items || items.length === 0) {
    return (
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={18} style={{ color: bucket.color }} />
          <h2 className="text-lg font-semibold text-text-primary">{bucket.label}</h2>
        </div>
        <p className="text-xs text-text-muted mb-3">{bucket.blurb}</p>
        <div className="text-xs text-text-muted italic bg-bg-secondary border border-border rounded-xl p-4">
          Nothing in this bucket this week.
        </div>
      </section>
    )
  }
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={18} style={{ color: bucket.color }} />
        <h2 className="text-lg font-semibold text-text-primary">{bucket.label}</h2>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: `color-mix(in srgb, ${bucket.color} 18%, transparent)`, color: bucket.color }}
        >
          {items.length}
        </span>
      </div>
      <p className="text-xs text-text-muted mb-3">{bucket.blurb}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, i) => (
          <RadarCard
            key={`${item.title}-${i}`}
            item={item}
            onAdd={onAdd}
            onDismiss={onDismiss}
            isAdded={addedItems.has(item.title)}
          />
        ))}
      </div>
    </section>
  )
}

export default function Radar() {
  const { items: catalogItems, addItem } = useCatalog()
  const { radar, loading, error, refresh: refreshRadar, isDemo } = useWeeklyRadar()
  const popular = usePopularItems()
  const [popularDetail, setPopularDetail] = useState(null)

  const inCatalog = (title, type) =>
    catalogItems.some(
      (i) => i.type === type && i.title.trim().toLowerCase() === String(title).trim().toLowerCase()
    )

  const [dismissed, setDismissed] = useState(new Set())
  const [addedItems, setAddedItems] = useState(new Set())

  const handleAdd = (item) => {
    addItem({
      title: item.title,
      creator: item.creator,
      type: item.type,
      genre: item.genre || '',
      coverUrl: item.coverUrl || '',
      year: item.year || (item.releaseDate ? String(item.releaseDate).slice(0, 4) : ''),
      status: 'want',
    })
    setAddedItems((prev) => new Set([...prev, item.title]))
  }

  const handleDismiss = (item) => {
    setDismissed((prev) => new Set([...prev, item.title]))
  }

  const fresh = useMemo(
    () => (radar?.fresh || []).filter((r) => !dismissed.has(r.title)),
    [radar, dismissed]
  )
  const hyped = useMemo(
    () => (radar?.hyped || []).filter((r) => !dismissed.has(r.title)),
    [radar, dismissed]
  )
  const darlings = useMemo(
    () => (radar?.darlings || []).filter((r) => !dismissed.has(r.title)),
    [radar, dismissed]
  )
  const totalPicks = fresh.length + hyped.length + darlings.length
  const bucketItems = { fresh, hyped, darlings }

  // catalogItems isn't read directly here — useCatalog is consumed for addItem.
  void catalogItems

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Weekly Radar</h1>
          <p className="text-text-secondary text-sm">
            {isDemo
              ? 'A sample dispatch: fictional picks, real vibes.'
              : "What's hyped this week, and what critics are quietly raving about."}
          </p>
        </div>
        <button
          onClick={refreshRadar}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {isDemo && (
        <div className="mb-6 flex items-start gap-2 p-3 bg-accent-primary/5 border border-accent-primary/20 rounded-xl">
          <Info size={16} className="text-accent-primary mt-0.5 shrink-0" />
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="font-medium text-accent-primary">Demo dispatch.</span>{' '}
            Sign in to see real Hyped + Critics' Darlings sourced from NYT Books, TMDB, and Pitchfork.
          </p>
        </div>
      )}

      {!isDemo && loading && !radar && (
        <div className="mb-6 flex items-center gap-2 text-sm text-text-muted">
          <Loader2 size={14} className="animate-spin" />
          Pulling this week's picks…
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

      {/* Popular with Users — what real people here are logging right now */}
      {popular.items.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={18} className="text-accent-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Popular with Users</h2>
          </div>
          <p className="text-xs text-text-muted mb-3">What multiple people logged lately. Tap to check one out.</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {popular.items.map((item) => (
              <div
                key={`${item.type}-${item.title}`}
                className="w-28 shrink-0 cursor-pointer group"
                onClick={() => setPopularDetail({ ...item, sourceLabel: 'Popular with users' })}
              >
                <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="lg" />
                <p className="text-xs font-medium text-text-primary truncate mt-1.5">{item.title}</p>
                <p className="text-[10px] truncate" style={{ color: getMediaColor(item.type) }}>
                  {item.userCount} people logged this
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {radar && totalPicks > 0 ? (
        <>
          {BUCKETS.filter((b) => b.key !== 'fresh' || radar?.fresh !== undefined).map((b) => (
            <BucketSection
              key={b.key}
              bucket={b}
              items={bucketItems[b.key]}
              onAdd={handleAdd}
              onDismiss={handleDismiss}
              addedItems={addedItems}
            />
          ))}
        </>
      ) : !loading ? (
        <div className="text-center py-12 bg-bg-secondary border border-border rounded-2xl">
          <RadarIcon size={32} className="mx-auto text-text-muted/30 mb-3" />
          <p className="text-text-secondary">Nothing on the radar right now. Try refreshing.</p>
        </div>
      ) : null}

      <FriendItemLightbox
        item={popularDetail}
        isOpen={!!popularDetail}
        onClose={() => setPopularDetail(null)}
        addItem={addItem}
        inCatalog={inCatalog}
      />

      {/* What this means — small footer */}
      {radar && (
        <div className="text-[11px] text-text-muted/80 italic text-center pt-2">
          Sources: NYT Best Sellers + reviews · TMDB critic scores · Pitchfork Best New Music · Spotify.{' '}
          <BadgeCheck size={10} className="inline -mt-0.5" /> Real picks, real sources.
        </div>
      )}
    </div>
  )
}
