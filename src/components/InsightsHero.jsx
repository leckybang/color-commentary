/**
 * InsightsHero — the first thing you see on the dashboard.
 *
 * Turns your catalog into a "look what you did" moment: a big finished-count,
 * a breakdown by medium, your favorites, and a one-tap shareable image card.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Share2, Star, Loader2, ArrowRight, Check } from 'lucide-react'
import CoverArt from './common/CoverArt'
import { getMediaColor } from '../utils/filterUtils'
import { computeInsights, insightsHeadline } from '../utils/insights'
import { shareInsightCard } from '../utils/shareCard'

export default function InsightsHero({ items, displayName }) {
  const insights = useMemo(() => computeInsights(items), [items])
  const [shareState, setShareState] = useState('idle') // idle | working | done

  const handleShare = async () => {
    if (shareState === 'working') return
    setShareState('working')
    try {
      await shareInsightCard(insights, { displayName })
      setShareState('done')
      setTimeout(() => setShareState('idle'), 2200)
    } catch (err) {
      console.error('Share card failed', err)
      setShareState('idle')
    }
  }

  // Empty state — no finishes yet. Keep it inviting, not a dead zone.
  if (!insights.hasData) {
    return (
      <div className="relative overflow-hidden rounded-2xl mb-6 p-6 border border-accent-primary/20 bg-gradient-to-br from-accent-primary/10 via-bg-secondary to-bg-secondary">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-accent-primary" />
          <h2 className="font-semibold text-text-primary">Your Insights</h2>
        </div>
        <p className="text-sm text-text-secondary mb-4 max-w-md">
          Finish your first thing and this turns into your personal highlight reel — counts, favorites, and a card you can share.
        </p>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-primary hover:underline"
        >
          Go to your catalog <ArrowRight size={14} />
        </Link>
      </div>
    )
  }

  const headline = insightsHeadline(insights)

  return (
    <div className="relative overflow-hidden rounded-2xl mb-6 border border-accent-primary/25 bg-gradient-to-br from-accent-primary/15 via-bg-secondary to-bg-secondary shadow-lg shadow-accent-primary/5">
      {/* soft glow */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-accent-primary/20 blur-3xl" />

      <div className="relative p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent-primary" />
            <h2 className="font-semibold text-text-primary">
              {insights.usingMonth ? `${insights.monthLabel} so far` : 'Your Insights'}
            </h2>
          </div>
          <button
            onClick={handleShare}
            disabled={shareState === 'working'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-primary text-white hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-60 shadow-md shadow-accent-primary/30"
          >
            {shareState === 'working' ? (
              <><Loader2 size={13} className="animate-spin" /> Making…</>
            ) : shareState === 'done' ? (
              <><Check size={13} /> Ready!</>
            ) : (
              <><Share2 size={13} /> Share</>
            )}
          </button>
        </div>

        {/* Big headline */}
        <h3
          className="text-2xl md:text-3xl font-bold text-text-primary leading-tight"
          style={{ fontFamily: "'Libre Baskerville', serif" }}
        >
          {headline}
        </h3>
        {insights.breakdown && (
          <p className="text-sm text-text-secondary mt-1.5">{insights.breakdown}</p>
        )}

        {/* Quick fact chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {insights.fiveStarCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-400 font-medium">
              <Star size={11} fill="currentColor" />
              {insights.fiveStarCount} five-star {insights.fiveStarCount === 1 ? 'pick' : 'picks'}
            </span>
          )}
          {insights.topGenre && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-bg-tertiary text-text-secondary font-medium">
              Mostly {insights.topGenre}
            </span>
          )}
          {insights.finishedThisYear > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-bg-tertiary text-text-secondary font-medium">
              {insights.finishedThisYear} this year
            </span>
          )}
        </div>

        {/* Favorites */}
        {insights.faves.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
              {insights.usingMonth ? 'Faves this month' : 'Your faves'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {insights.faves.map((f) => {
                const color = getMediaColor(f.type)
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-bg-tertiary/60"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <CoverArt title={f.title} type={f.type} creator={f.creator} coverUrl={f.coverUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{f.title}</p>
                      <div className="flex items-center gap-1 text-amber-500 mt-0.5">
                        {Array.from({ length: f.rating }).map((_, i) => (
                          <Star key={i} size={10} fill="currentColor" />
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
