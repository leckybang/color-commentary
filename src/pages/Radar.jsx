import { useState, useMemo } from 'react'
import { Radar as RadarIcon, BadgeCheck, Calendar, Loader2, RefreshCw, ChevronDown, ChevronUp, Check, Bookmark, Info, Music, Film, Tv, BookOpen, Newspaper, ExternalLink, TrendingUp, Award, Users, Zap, Flame } from 'lucide-react'
import CoverArt from '../components/common/CoverArt'
import FriendItemLightbox from '../components/FriendItemLightbox'
import { usePopularItems } from '../hooks/usePopularItems'
import ExternalLinks from '../components/common/ExternalLinks'
import { useCatalog } from '../hooks/useCatalog'
import { useWeeklyRadar } from '../hooks/useWeeklyRadar'
import { getMediaColor } from '../utils/filterUtils'

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

function BucketSection({ bucket, items, onItemClick, inCatalog }) {
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
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {items.map((item, i) => {
          const owned = inCatalog(item.title, item.type)
          return (
            <div
              key={`${item.title}-${i}`}
              className="w-28 shrink-0 cursor-pointer group"
              onClick={() => onItemClick(item)}
            >
              <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="lg" />
              <p className="text-xs font-medium text-text-primary truncate mt-1.5">{item.title}</p>
              <p className="text-[10px] truncate" style={{ color: owned ? 'var(--color-accent-books)' : getMediaColor(item.type) }}>
                {owned ? '✓ In your log' : item.source || item.creator || ''}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function Radar() {
  const { items: catalogItems, addItem } = useCatalog()
  const { radar, loading, error, refresh: refreshRadar, isDemo } = useWeeklyRadar()
  const popular = usePopularItems()
  const [detailItem, setDetailItem] = useState(null)

  const inCatalog = (title, type) =>
    catalogItems.some(
      (i) => i.type === type && i.title.trim().toLowerCase() === String(title).trim().toLowerCase()
    )

  const [dismissed, setDismissed] = useState(new Set())

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
                onClick={() => setDetailItem({ ...item, source: `${item.userCount} people logged this`, sourceLabel: 'Popular with users' })}
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
              inCatalog={inCatalog}
              onItemClick={(item) =>
                setDetailItem({ ...item, sourceLabel: b.label, sourceLink: reviewLink(item) })
              }
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
        item={detailItem}
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        addItem={addItem}
        inCatalog={inCatalog}
        onDismiss={handleDismiss}
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
