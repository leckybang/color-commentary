import { useMemo, useState } from 'react'
import { BarChart3, Star, TrendingUp, ChevronDown, ChevronUp, Music, Film, Tv, BookOpen } from 'lucide-react'
import {
  getActivityRollup,
  getActivityByType,
  buildNarrative,
  getTopRated,
  getRecentHighlyRated,
} from '../utils/catalogStats'
import CoverArt from './common/CoverArt'

const TYPE_META = {
  book: { label: 'Books', icon: BookOpen, color: 'var(--color-accent-books)' },
  tv: { label: 'TV', icon: Tv, color: 'var(--color-accent-tv)' },
  movie: { label: 'Movies', icon: Film, color: 'var(--color-accent-movies)' },
  music: { label: 'Music', icon: Music, color: 'var(--color-accent-music)' },
}
const TYPE_ORDER = ['book', 'tv', 'movie', 'music']

const PERIODS = [
  { v: 'week', l: 'This week' },
  { v: 'month', l: 'This month' },
  { v: 'year', l: 'This year' },
]

// Compact stat tile per media type.
function TypeTile({ type, stat }) {
  const m = TYPE_META[type]
  const Icon = m.icon
  const dim = stat.added === 0 && stat.finished === 0 && stat.inProgress === 0
  return (
    <div
      className="rounded-xl p-3 border bg-bg-tertiary relative overflow-hidden"
      style={{ borderColor: dim ? 'var(--color-border)' : `color-mix(in srgb, ${m.color} 35%, transparent)` }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: m.color, opacity: dim ? 0.25 : 1 }} />
      <div className="flex items-center gap-1.5 mb-1.5 mt-1">
        <Icon size={13} style={{ color: m.color }} />
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">{m.label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold" style={{ color: dim ? 'var(--color-text-muted)' : m.color }}>
          {stat.added}
        </span>
        <span className="text-[10px] text-text-muted">added</span>
      </div>
      <p className="text-[11px] text-text-muted mt-0.5">
        {stat.finished} done · {stat.inProgress} in progress
      </p>
    </div>
  )
}

// Slim 100%-width bar showing the period's added split by type.
function ProportionBar({ by }) {
  const total = TYPE_ORDER.reduce((s, t) => s + by[t].added, 0)
  if (total === 0) return null
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-bg-tertiary">
        {TYPE_ORDER.map((t) => {
          const w = (by[t].added / total) * 100
          if (w === 0) return null
          return <div key={t} style={{ width: `${w}%`, backgroundColor: TYPE_META[t].color }} />
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-text-muted">
        {TYPE_ORDER.map((t) => (
          by[t].added > 0 ? (
            <span key={t} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: TYPE_META[t].color }} />
              {by[t].added} {TYPE_META[t].label.toLowerCase()}
            </span>
          ) : null
        ))}
      </div>
    </div>
  )
}

// Numbers lead the hierarchy: "You've read 1 book this week" renders the 1
// big and bold so the stat pops before the sentence does.
function NarrativeLine({ line }) {
  return (
    <p className="text-sm text-text-secondary leading-relaxed">
      {line.split(/(\d+)/).map((part, i) =>
        /^\d+$/.test(part) ? (
          <span key={i} className="text-2xl font-extrabold text-text-primary align-baseline px-0.5">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  )
}

function ItemRow({ item, onClick }) {
  return (
    <button
      onClick={() => onClick?.(item)}
      className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-bg-hover transition-colors w-full text-left"
    >
      <CoverArt title={item.title} type={item.type} coverUrl={item.coverUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
        <p className="text-xs text-text-muted truncate">{item.creator}</p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Star size={11} fill="currentColor" className="text-amber-500" />
        <span className="text-xs font-medium text-amber-500">{item.rating}</span>
      </div>
    </button>
  )
}

/**
 * CatalogInsights — compact infographic over the catalog.
 * Counts added + finished + in-progress (not just finished), so it reflects
 * everything logged via Quick Add.
 */
export default function CatalogInsights({ items, onItemClick, defaultOpen = false, compact = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const [period, setPeriod] = useState(null) // null = follow the smart default below

  const rollup = useMemo(() => getActivityRollup(items), [items])
  // Open on the most granular period that actually has activity, so the panel
  // never shows an all-zero "This month" at the very start of a month/week.
  const activePeriod = period ?? (
    (rollup.week.added || rollup.week.finished) ? 'week'
      : (rollup.month.added || rollup.month.finished) ? 'month'
      : 'year'
  )
  const narrative = useMemo(() => buildNarrative(items, activePeriod), [items, activePeriod])
  const activity = useMemo(() => getActivityByType(items, activePeriod), [items, activePeriod])
  const topRated = useMemo(() => getTopRated(items, 5, 4), [items])
  const recentStars = useMemo(() => getRecentHighlyRated(items, 5, 30, 4), [items])

  // Collapsed-header summary: lead with the smallest non-empty "added" window
  // (never a row of zeros) plus what's in progress. This line is all most
  // people see, so it has to carry a real signal on its own.
  const inProgress = useMemo(() => items.filter((i) => i.status === 'watching').length, [items])
  // Tiny cover-stack preview of the goodies inside — top-rated first, then
  // most recent, so the collapsed row hints at what's behind it.
  const previewItems = useMemo(() => {
    const seen = new Set()
    const picks = []
    for (const item of [...topRated, ...items]) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      picks.push(item)
      if (picks.length >= 4) break
    }
    return picks
  }, [topRated, items])
  const headerSummary = (() => {
    const added = rollup.week.added > 0 ? `${rollup.week.added} added this week`
      : rollup.month.added > 0 ? `${rollup.month.added} added this month`
      : rollup.year.added > 0 ? `${rollup.year.added} added this year`
      : null
    const bits = [added, inProgress > 0 ? `${inProgress} in progress` : null].filter(Boolean)
    return bits.length ? bits.join(' · ') : (items.length ? `${items.length} in your library` : 'Nothing logged yet')
  })()

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-bg-hover/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-left min-w-0">
          <BarChart3 size={18} className="text-accent-primary shrink-0" />
          <h2 className="font-semibold text-text-primary">Insights</h2>
          <span className="text-xs text-text-muted truncate">
            {headerSummary}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!open && previewItems.length > 0 && (
            <div className="hidden sm:flex -space-x-2">
              {previewItems.map((item) => {
                const color = TYPE_META[item.type]?.color || 'var(--color-accent-primary)'
                return (
                  <div
                    key={item.id}
                    className="w-7 h-9 rounded-md overflow-hidden ring-2 ring-bg-secondary shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 25%, var(--color-bg-tertiary))` }}
                    title={item.title}
                  >
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[10px] font-bold" style={{ color }}>{(item.title || '?')[0]}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {open ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          {/* Period toggle */}
          <div className="flex bg-bg-tertiary rounded-lg p-0.5 w-fit">
            {PERIODS.map((p) => (
              <button
                key={p.v}
                onClick={() => setPeriod(p.v)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  activePeriod === p.v ? 'bg-bg-secondary text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {p.l}
              </button>
            ))}
          </div>

          {/* Narrative headline — numbers big, words small */}
          <div className="space-y-1.5">
            {narrative.lines.map((line, i) => (
              <NarrativeLine key={i} line={line} />
            ))}
          </div>

          {/* Per-type tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {TYPE_ORDER.map((t) => (
              <TypeTile key={t} type={t} stat={activity.by[t]} />
            ))}
          </div>

          {/* Proportion bar */}
          <ProportionBar by={activity.by} />

          {!compact && (topRated.length > 0 || recentStars.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {topRated.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Star size={13} className="text-amber-500" fill="currentColor" />
                    <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                      Top-rated faves
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {topRated.map((item) => (
                      <ItemRow key={item.id} item={item} onClick={onItemClick} />
                    ))}
                  </div>
                </div>
              )}
              {recentStars.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingUp size={13} className="text-accent-primary" />
                    <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                      Recently 4+ starred
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {recentStars.map((item) => (
                      <ItemRow key={item.id} item={item} onClick={onItemClick} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
