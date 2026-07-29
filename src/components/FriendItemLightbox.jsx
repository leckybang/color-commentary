/**
 * FriendItemLightbox — tap into something a friend cataloged (or a note you
 * parked in the scratchpad), learn more, and grab it for your own catalog
 * with the status that fits (Want to Try / In Progress / Finished). Used by
 * the friends feed, friend profiles, and Someone Told Me About.
 */

import { useEffect, useRef, useState } from 'react'
import { X, Star, Bookmark, Play, Check, Library, Newspaper, ExternalLink as ExternalLinkIcon, Share2, Loader2 } from 'lucide-react'
import CoverArt from './common/CoverArt'
import StarRating from './common/StarRating'
import ExternalLinks from './common/ExternalLinks'
import { getMediaColor } from '../utils/filterUtils'
import { splitAccolades } from '../utils/mediaText'
import { searchGoogleBooks } from '../services/providers/googleBooks'
import { buildItemCard } from '../utils/shareCard'
import { usePublicProfile } from '../hooks/usePublicProfile'
import ShareCardPreview from './common/ShareCardPreview'
import { formatRating } from '../utils/ratingUtils'
import VibeTagPicker, { VibeTagList } from './common/VibeTags'

const TYPE_LABELS = { music: 'Music', movie: 'Movie', tv: 'TV', book: 'Book' }

// Statuses have their own palette (coral/teal/gold), distinct from the
// media-type accents.
const ADD_OPTIONS = [
  { status: 'want', label: 'Want to Try', icon: Bookmark, color: 'var(--color-status-want)' },
  { status: 'watching', label: 'In Progress', icon: Play, color: 'var(--color-status-progress)' },
  { status: 'finished', label: 'Finished', icon: Check, color: 'var(--color-status-finished)' },
]

// Session-scoped detail cache so reopening the same title doesn't refetch.
const detailCache = new Map()

export default function FriendItemLightbox({ item, isOpen, onClose, addItem, inCatalog, onAdded, onDismiss }) {
  const overlayRef = useRef(null)
  const fetchRef = useRef(0)
  const [detail, setDetail] = useState(null)
  const [addedAs, setAddedAs] = useState(null)
  // Finishing something deserves a beat: rate it and jot a take before it
  // files into the log.
  const [finishing, setFinishing] = useState(false)
  const [finishRating, setFinishRating] = useState(0)
  const [finishReview, setFinishReview] = useState('')
  const [finishVibes, setFinishVibes] = useState([])
  const { username } = usePublicProfile()
  const [shareCard, setShareCard] = useState(null) // { url, blob, filename }
  const [buildingCard, setBuildingCard] = useState(false)

  // Reset per item (adjust-during-render pattern).
  const [itemKey, setItemKey] = useState(null)
  const key = item ? `${item.type}:${item.title}:${item.creator || ''}` : null
  if (key !== itemKey) {
    setItemKey(key)
    setAddedAs(null)
    setFinishing(false)
    setFinishRating(0)
    setFinishReview('')
    setFinishVibes([])
    setShareCard(null)
    setDetail(key ? detailCache.get(key) || null : null)
  }

  useEffect(() => {
    if (!isOpen || !key || detailCache.has(key)) return
    const fetchId = ++fetchRef.current
    fetch('/.netlify/functions/media-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item: { title: item.title, creator: item.creator || '', type: item.type },
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch(() => null)
      .then(async (data) => {
        // Server-side Google Books calls can fail from serverless IPs even
        // when the API itself is fine — fill missing book descriptions from
        // the browser, where the same lookup reliably works. Also covers the
        // detail function erroring outright.
        let result = data || { description: '', rating: null, related: [] }
        if (item.type === 'book' && !result.description) {
          try {
            const results = await searchGoogleBooks(
              item.creator ? `intitle:"${item.title}" inauthor:"${item.creator}"` : `intitle:"${item.title}"`
            )
            const hit = results.find((r) => r.overview)
            if (hit) result = { ...result, description: hit.overview }
          } catch {
            /* fallback is best-effort */
          }
        }
        if (fetchRef.current !== fetchId) return
        detailCache.set(key, result)
        setDetail(result)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, key])

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !item) return null

  const color = getMediaColor(item.type)
  const owned = inCatalog?.(item.title, item.type)

  const handleAdd = (status, extras = {}) => {
    addItem({
      title: item.title,
      creator: item.creator || '',
      type: item.type,
      genre: item.genre || '',
      year: item.year || '',
      coverUrl: item.coverUrl || '',
      status,
      ...(status === 'finished' ? { dateConsumed: new Date().toISOString() } : {}),
      ...extras,
    })
    setAddedAs(status)
    onAdded?.(item, status)
  }

  const handleBuildShare = async () => {
    if (buildingCard) return
    setBuildingCard(true)
    try {
      const { blob, filename } = await buildItemCard(
        { ...item, rating: finishRating, review: finishReview.trim(), vibeTags: finishVibes },
        { username }
      )
      setShareCard({ blob, filename, url: URL.createObjectURL(blob) })
    } catch (err) {
      console.error('Item share card failed', err)
    } finally {
      setBuildingCard(false)
    }
  }


  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className="bg-bg-secondary border border-border rounded-2xl w-full shadow-2xl flex flex-col"
        style={{ maxWidth: '560px', maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {item.sourceLabel || (item.friendName ? `From ${item.friendName}'s log` : 'From a friend')}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="flex gap-4 items-start">
            <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-text-primary leading-tight">{item.title}</h2>
              {item.creator && <p className="text-sm text-text-secondary mt-0.5">{item.creator}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                >
                  {TYPE_LABELS[item.type] || item.type}
                </span>
                {item.year && <span className="text-xs text-text-muted">{item.year}</span>}
                {item.source && (
                  item.sourceLink?.url ? (
                    <a
                      href={item.sourceLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25 transition-colors"
                      title={`Read the ${item.sourceLink.label || ''} review`}
                    >
                      <Newspaper size={10} />
                      {item.source}
                      <ExternalLinkIcon size={9} />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-accent-primary/15 text-accent-primary">
                      <Newspaper size={10} />
                      {item.source}
                    </span>
                  )
                )}
              </div>
              {item.rating > 0 && (
                <p className="flex items-center gap-1 mt-2 text-sm font-semibold text-amber-500">
                  <Star size={13} fill="currentColor" />
                  {formatRating(item.rating)}/5
                  {item.friendName && <span className="text-xs font-normal text-text-muted">from {item.friendName}</span>}
                </p>
              )}
              {/* How they described it, when the item came from a friend's log. */}
              <VibeTagList tags={item.vibeTags} size="xs" className="mt-2" />
            </div>
          </div>

          {(detail?.description || item.blurb || item.description) && (() => {
            const { accolades, body } = splitAccolades(detail?.description || item.blurb || item.description)
            return (
              <div className="space-y-2">
                {accolades && (
                  <p className="text-[11px] text-text-muted italic leading-relaxed border-l-2 border-border pl-2.5">
                    {accolades}
                  </p>
                )}
                <p className="text-sm text-text-secondary leading-relaxed">{body}</p>
              </div>
            )
          })()}

          {(detail?.credits?.director || (detail?.credits?.cast || []).length > 0) && (
            <p className="text-xs text-text-secondary leading-relaxed">
              {detail.credits.director && (
                <>
                  <span className="text-text-muted">{item.type === 'tv' ? 'Created by' : 'Directed by'}</span>{' '}
                  <span className="font-medium">{detail.credits.director}</span>
                </>
              )}
              {detail.credits.director && (detail.credits.cast || []).length > 0 && ' · '}
              {(detail.credits.cast || []).length > 0 && (
                <>
                  <span className="text-text-muted">Starring</span>{' '}
                  <span className="font-medium">{detail.credits.cast.join(', ')}</span>
                </>
              )}
            </p>
          )}

          <ExternalLinks type={item.type} title={item.title} creator={item.creator} />

          {/* Add to your catalog, with the status that fits */}
          <div className="pt-3 border-t border-border">
            {owned && !addedAs ? (
              <p className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-text-primary">
                <Library size={15} />
                Already in your log
              </p>
            ) : addedAs ? (
              <div className="py-1 text-center">
                <p className="flex items-center justify-center gap-1.5 py-1 text-sm font-medium text-text-primary">
                  <Check size={15} />
                  Added as {ADD_OPTIONS.find((o) => o.status === addedAs)?.label}
                </p>
                {addedAs === 'finished' && (
                  <button
                    onClick={handleBuildShare}
                    disabled={buildingCard}
                    className="mt-2 inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)', boxShadow: '2px 2px 0 var(--color-accent-primary)' }}
                  >
                    {buildingCard ? (
                      <><Loader2 size={13} className="animate-spin" /> Making your card…</>
                    ) : (
                      <><Share2 size={13} /> Share it</>
                    )}
                  </button>
                )}
              </div>
            ) : finishing ? (
              <div>
                {/* Sentence case, not the uppercase the other section labels
                    use — this one is a full sentence, and all-caps at that
                    length reads as shouting. */}
                <p className="text-sm font-semibold text-text-primary mb-2">Way to finish something. What'd you think?</p>
                <div className="flex justify-center mb-3">
                  <StarRating rating={finishRating} onChange={setFinishRating} size={26} />
                </div>
                <div className="mb-3">
                  <VibeTagPicker tags={finishVibes} onChange={setFinishVibes} compact />
                </div>
                <textarea
                  value={finishReview}
                  onChange={(e) => setFinishReview(e.target.value)}
                  placeholder="Your quick take (optional)"
                  rows={2}
                  className="w-full bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary resize-none mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setFinishing(false)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleAdd('finished', { rating: finishRating, review: finishReview.trim(), vibeTags: finishVibes })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)', boxShadow: '2px 2px 0 var(--color-accent-primary)' }}
                  >
                    <Check size={13} />
                    {finishRating > 0 || finishReview.trim() || finishVibes.length > 0 ? 'Save to log' : 'Log without rating'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Add to your log</p>
                <div className="grid grid-cols-3 gap-2">
                  {ADD_OPTIONS.map((o) => {
                    const Icon = o.icon
                    return (
                      <button
                        key={o.status}
                        onClick={() => (o.status === 'finished' ? setFinishing(true) : handleAdd(o.status))}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-[1.5px] transition-all active:scale-95 hover:opacity-90"
                        style={{
                          color: o.color,
                          backgroundColor: `color-mix(in srgb, ${o.color} 12%, var(--color-bg-secondary))`,
                          borderColor: `color-mix(in srgb, ${o.color} 40%, transparent)`,
                        }}
                      >
                        <Icon size={13} />
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            <ShareCardPreview card={shareCard} onClose={() => setShareCard(null)} />

            {onDismiss && !owned && !addedAs && (
              <button
                onClick={() => {
                  onDismiss(item)
                  onClose()
                }}
                className="w-full mt-2 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                {item.noteId ? 'Remove note' : 'Not for me'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
