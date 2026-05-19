import { useMemo, useState } from 'react'
import { BarChart3, Star, TrendingUp, Calendar, ChevronDown, ChevronUp, Music, Film, Tv, BookOpen } from 'lucide-react'
import {
  getFinishedByWeek,
  getFinishedByMonth,
  getRollupCounts,
  getTopRated,
  getRecentHighlyRated,
} from '../utils/catalogStats'
import CoverArt from './common/CoverArt'

const TYPE_ICON = { music: Music, movie: Film, tv: Tv, book: BookOpen }
const TYPE_COLORS = {
  music: 'var(--color-accent-music)',
  movie: 'var(--color-accent-movies)',
  tv: 'var(--color-accent-tv)',
  book: 'var(--color-accent-books)',
}

// Stacked vertical bar chart — one bar per bucket, stacked by media type.
function StackedBars({ buckets }) {
  const max = Math.max(1, ...buckets.map((b) => b.total))
  return (
    <div className="flex items-end gap-1.5 h-24">
      {buckets.map((b, i) => {
        const total = b.total
        const pctTotal = (total / max) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="w-full flex-1 flex items-end relative" title={`${total} finished — week of ${b.label}`}>
              <div
                className="w-full rounded-md overflow-hidden flex flex-col-reverse transition-all"
                style={{ height: `${Math.max(pctTotal, total > 0 ? 6 : 2)}%`, minHeight: total > 0 ? 6 : 2 }}
              >
                {['music', 'movie', 'tv', 'book'].map((t) => {
                  const c = b.byType[t] || 0
                  if (c === 0) return null
                  const segPct = (c / total) * 100
                  return (
                    <div
                      key={t}
                      style={{
                        height: `${segPct}%`,
                        backgroundColor: TYPE_COLORS[t],
                        opacity: 0.85,
                      }}
                    />
                  )
                })}
                {total === 0 && (
                  <div className="w-full h-full bg-bg-tertiary" />
                )}
              </div>
            </div>
            <span className="text-[10px] text-text-muted truncate w-full text-center">{b.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function ItemRow({ item, onClick }) {
  return (
    <button
      onClick={() => onClick?.(item)}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors w-full text-left"
    >
      <CoverArt title={item.title} type={item.type} coverUrl={item.coverUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
        <p className="text-xs text-text-muted truncate">{item.creator}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Star size={11} fill="currentColor" className="text-amber-500" />
        <span className="text-xs font-medium text-amber-500">{item.rating}</span>
      </div>
    </button>
  )
}

/**
 * CatalogInsights — analytics dashboard for finished items + ratings.
 *
 * Props:
 *   items: full catalog items array
 *   onItemClick?: (item) => void   — for top-rated/recent items
 *   defaultOpen?: boolean          — start expanded
 *   compact?: boolean              — drop secondary sections
 */
export default function CatalogInsights({ items, onItemClick, defaultOpen = false, compact = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const [granularity, setGranularity] = useState('week') // 'week' | 'month'

  const rollup = useMemo(() => getRollupCounts(items), [items])
  const buckets = useMemo(
    () => (granularity === 'week' ? getFinishedByWeek(items, 8) : getFinishedByMonth(items, 6)),
    [items, granularity]
  )
  const topRated = useMemo(() => getTopRated(items, 6, 4), [items])
  const recentStars = useMemo(() => getRecentHighlyRated(items, 6, 30, 4), [items])

  const totalCount = items.length

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-bg-hover/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-accent-primary" />
          <h2 className="font-semibold text-text-primary">Insights</h2>
          <span className="text-xs text-text-muted">
            {rollup.week} this week · {rollup.month} this month · {rollup.year} this year
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-border pt-5">
          {/* Rollup row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'This week', value: rollup.week, accent: 'var(--color-accent-tv)' },
              { label: 'This month', value: rollup.month, accent: 'var(--color-accent-primary)' },
              { label: 'This year', value: rollup.year, accent: 'var(--color-accent-books)' },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-bg-tertiary rounded-xl p-3 border"
                style={{ borderColor: `color-mix(in srgb, ${m.accent} 25%, transparent)` }}
              >
                <p className="text-xs text-text-muted uppercase tracking-wide">{m.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: m.accent }}>{m.value}</p>
                <p className="text-[10px] text-text-muted mt-0.5">finished</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-text-muted" />
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Finished over time
                </span>
              </div>
              <div className="flex bg-bg-tertiary rounded-lg p-0.5">
                {[
                  { v: 'week', l: 'Weeks' },
                  { v: 'month', l: 'Months' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setGranularity(opt.v)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      granularity === opt.v
                        ? 'bg-bg-secondary text-text-primary'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
            <StackedBars buckets={buckets} />
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-text-muted">
              {['music', 'movie', 'tv', 'book'].map((t) => {
                const Icon = TYPE_ICON[t]
                return (
                  <span key={t} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TYPE_COLORS[t] }} />
                    <Icon size={11} />
                    <span className="capitalize">{t === 'movie' ? 'movies' : t}</span>
                  </span>
                )
              })}
            </div>
          </div>

          {!compact && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top-rated */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Star size={14} className="text-amber-500" fill="currentColor" />
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Top-rated faves
                  </span>
                </div>
                {topRated.length > 0 ? (
                  <div className="space-y-1">
                    {topRated.map((item) => (
                      <ItemRow key={item.id} item={item} onClick={onItemClick} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">No 4+ star items yet.</p>
                )}
              </div>

              {/* Recent high-stars */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={14} className="text-accent-primary" />
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Recently 4+ starred
                  </span>
                </div>
                {recentStars.length > 0 ? (
                  <div className="space-y-1">
                    {recentStars.map((item) => (
                      <ItemRow key={item.id} item={item} onClick={onItemClick} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">
                    Nothing 4+ starred in the last 30 days.
                  </p>
                )}
              </div>
            </div>
          )}

          {totalCount === 0 && (
            <p className="text-xs text-text-muted italic text-center py-2">
              Start cataloging finished items and rating them — that's what fuels this.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
