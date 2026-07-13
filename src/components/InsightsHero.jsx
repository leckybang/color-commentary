/**
 * InsightsHero — the first thing you see on the dashboard.
 *
 * Turns your catalog into a "look what you did" moment: a big finished-count,
 * a breakdown by medium, your favorites, and a shareable image card. Pressing
 * Share builds the card and shows a photo preview first, with the option to
 * download it before (or instead of) sending it anywhere.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Share2, Star, Loader2, ArrowRight, Download } from 'lucide-react'
import CoverArt from './common/CoverArt'
import Modal from './common/Modal'
import { getMediaColor } from '../utils/filterUtils'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { computeInsights, insightsHeadline } from '../utils/insights'
import { buildInsightCard, shareCardBlob, canShareFile, downloadBlob } from '../utils/shareCard'

export default function InsightsHero({ items, stats = {} }) {
  const insights = useMemo(() => computeInsights(items), [items])
  const { username } = usePublicProfile()
  const [building, setBuilding] = useState(false)
  const [card, setCard] = useState(null) // { blob, filename, url }
  const cardUrlRef = useRef(null)

  // Revoke the preview object URL when it's replaced or on unmount.
  useEffect(() => {
    cardUrlRef.current = card?.url || null
    return () => {
      if (cardUrlRef.current) URL.revokeObjectURL(cardUrlRef.current)
    }
  }, [card])

  const handleShare = async () => {
    if (building) return
    setBuilding(true)
    try {
      const { blob, filename } = await buildInsightCard(insights, { username })
      setCard({ blob, filename, url: URL.createObjectURL(blob) })
    } catch (err) {
      console.error('Share card failed', err)
    } finally {
      setBuilding(false)
    }
  }

  const closePreview = () => setCard(null)

  const handleDownload = () => {
    if (card) downloadBlob(card.blob, card.filename)
  }

  const handleSendToShare = async () => {
    if (!card) return
    const result = await shareCardBlob(card.blob, card.filename)
    if (result === 'unsupported') {
      // No native share sheet (most desktops) — fall back to download.
      downloadBlob(card.blob, card.filename)
    }
    if (result === 'shared') closePreview()
  }

  // Empty state — no finishes yet. Keep it inviting, not a dead zone.
  if (!insights.hasData) {
    return (
      <div className="ink-card relative overflow-hidden rounded-2xl mb-6 p-6 bg-gradient-to-br from-accent-primary/10 via-bg-secondary to-bg-secondary">
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={18} className="text-accent-primary" />
          <h2 className="font-semibold text-text-primary">Your Insights</h2>
        </div>
        <p className="text-sm text-text-secondary mb-4 max-w-md">
          Finish your first thing and this turns into your personal highlight reel: counts, favorites, and a card you can share.
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
  const shareSupported = card ? canShareFile(card.blob, card.filename) : false

  return (
    <div className="ink-card relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-accent-primary/10 via-bg-secondary to-bg-secondary">
      {/* soft glow */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-accent-primary/20 blur-3xl" />

      <div className="relative p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-accent-primary" />
            <h2 className="font-semibold text-text-primary">
              {insights.usingMonth ? `${insights.monthLabel} so far` : 'Your Insights'}
            </h2>
          </div>
          <button
            onClick={handleShare}
            disabled={building}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)', boxShadow: '3px 3px 0 var(--color-accent-primary)' }}
          >
            {building ? (
              <><Loader2 size={13} className="animate-spin" /> Making…</>
            ) : (
              <><Share2 size={13} /> Share</>
            )}
          </button>
        </div>

        {/* Headline */}
        <h3
          className="text-xl md:text-2xl font-bold text-text-primary leading-tight"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {headline}
        </h3>
        {insights.breakdown && (
          <p className="text-sm text-text-secondary mt-1.5">{insights.breakdown}</p>
        )}

        {/* Quantified self — the numbers that matter, at a glance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: insights.usingMonth ? `Finished in ${insights.monthLabel}` : 'Finished all time', value: insights.count, color: 'var(--color-accent-books)' },
            { label: 'Cataloged', value: stats.total ?? '—', color: 'var(--color-accent-tv)' },
            { label: 'Added this week', value: stats.addedThisWeek ?? '—', color: 'var(--color-accent-music)' },
            { label: 'Avg rating', value: stats.avgRating || '—', color: '#f59e0b' },
          ].map((t) => (
            <div
              key={t.label}
              className="relative overflow-hidden rounded-xl p-3 border-[1.5px] border-text-primary"
              style={{ backgroundColor: `color-mix(in srgb, ${t.color} 16%, var(--color-bg-secondary))` }}
            >
              <span className="absolute top-0 right-0 w-5 h-5 rounded-bl-xl" style={{ backgroundColor: t.color }} aria-hidden="true" />
              <p className="text-2xl font-extrabold text-text-primary leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
                {t.value}
              </p>
              <p className="text-[11px] font-semibold text-text-secondary mt-1">{t.label}</p>
            </div>
          ))}
        </div>

        <div>
          <div>
            {/* Quick fact chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              {insights.fiveStarCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold text-text-primary border-[1.5px] border-text-primary" style={{ backgroundColor: '#ffd76e' }}>
                  <Star size={11} fill="currentColor" />
                  {insights.fiveStarCount} five-star {insights.fiveStarCount === 1 ? 'pick' : 'picks'}
                </span>
              )}
              {insights.topGenre && (
                <span className="text-xs px-3 py-1 rounded-full font-bold text-text-primary border-[1.5px] border-text-primary bg-bg-secondary">
                  Mostly {insights.topGenre}
                </span>
              )}
              {insights.finishedThisYear > 0 && (
                <span className="text-xs px-3 py-1 rounded-full font-bold text-text-primary border-[1.5px] border-text-primary bg-bg-secondary">
                  {insights.finishedThisYear} this year
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Favorites */}
        {insights.faves.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
              {insights.usingMonth ? 'Faves this month' : 'Your faves'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {insights.faves.slice(0, 3).map((f) => {
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

      {/* Preview-before-share: see the photo, download it, then send it. */}
      <Modal isOpen={!!card} onClose={closePreview} title="Your share card" maxWidth="440px">
        {card && (
          <div>
            <img
              src={card.url}
              alt="Preview of your insights share card"
              className="w-full rounded-xl border border-border shadow-lg mb-4"
            />
            {!username && (
              <p className="text-xs text-text-muted mb-3 -mt-1">
                Psst: set your @username in{' '}
                <Link to="/me?tab=settings" className="text-accent-primary font-semibold hover:underline">
                  Settings
                </Link>{' '}
                and your card will carry a follow-me handle.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium border border-border text-text-primary hover:bg-bg-hover transition-colors"
              >
                <Download size={15} />
                Download
              </button>
              <button
                onClick={handleSendToShare}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold bg-accent-primary text-white hover:bg-accent-hover transition-colors shadow-md shadow-accent-primary/30"
              >
                <Share2 size={15} />
                {shareSupported ? 'Share' : 'Save image'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
