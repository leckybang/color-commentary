/**
 * ItemLightbox — rich per-catalog-item modal.
 *
 * Opens when a user clicks a catalog item. Shows item details at the top, then
 * fast, factual context below: a short description, a critics rating, and
 * related / more-by suggestions. All sourced from free providers (TMDB, Google
 * Books, Spotify) via the media-detail function — no slow LLM call. Cached in
 * localStorage per item ID (7-day TTL).
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Edit2, Loader2, Music, Film, Tv, BookOpen, Star, Award, Trash2, EyeOff } from 'lucide-react'
import CoverArt from './common/CoverArt'
import ExternalLinks from './common/ExternalLinks'
import SuggestionLightbox from './SuggestionLightbox'
import { getMediaColor } from '../utils/filterUtils'

const DETAIL_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const TYPE_LABELS = { music: 'Music', movie: 'Movie', tv: 'TV', book: 'Book' }

// Status picker shown right under the title — colors mirror the Catalog sections.
const STATUS_PICKER = [
  { value: 'want', label: 'Want to Try', color: 'var(--color-accent-primary)' },
  { value: 'watching', label: 'In Progress', color: 'var(--color-accent-tv)' },
  { value: 'finished', label: 'Finished', color: 'var(--color-accent-books)' },
  { value: 'dropped', label: 'Dropped', color: 'var(--color-text-muted)' },
]

function detailCacheKey(itemId) {
  return `cc_detail_v1_${itemId}`
}

function readDetailCache(itemId) {
  try {
    const raw = localStorage.getItem(detailCacheKey(itemId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.cachedAt || !parsed.data) return null
    if (Date.now() - parsed.cachedAt > DETAIL_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeDetailCache(itemId, data) {
  try {
    localStorage.setItem(detailCacheKey(itemId), JSON.stringify({ data, cachedAt: Date.now() }))
  } catch {}
}

function StarDisplay({ rating }) {
  if (!rating || rating <= 0) return null
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          className={n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-text-muted/30'}
        />
      ))}
    </div>
  )
}

function SuggestionCard({ suggestion, onOpen }) {
  return (
    <button
      onClick={() => onOpen(suggestion)}
      className="w-full text-left flex items-start gap-3 p-3 rounded-xl bg-bg-tertiary border border-border hover:border-accent-primary/30 hover:bg-bg-hover transition-all group"
    >
      <CoverArt
        title={suggestion.title}
        type={suggestion.type}
        creator={suggestion.creator}
        coverUrl={suggestion.coverUrl}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary leading-tight group-hover:text-accent-primary transition-colors">
          {suggestion.title}
        </p>
        {suggestion.creator && (
          <p className="text-xs text-text-muted mt-0.5 truncate">{suggestion.creator}</p>
        )}
        {suggestion.reason && (
          <p className="text-xs text-text-secondary mt-1.5 leading-relaxed italic">{suggestion.reason}</p>
        )}
      </div>
    </button>
  )
}

export default function ItemLightbox({ item, isOpen, onClose, onEdit, onUpdate, onFinish, onDelete, addItem }) {
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [activeSuggestion, setActiveSuggestion] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Reset the delete confirmation when a different item opens (adjust-during-
  // render pattern; an effect here would double-render).
  const [confirmItemId, setConfirmItemId] = useState(null)
  if (item && confirmItemId !== item.id) {
    setConfirmItemId(item.id)
    if (confirmDelete) setConfirmDelete(false)
  }
  const overlayRef = useRef(null)
  const fetchRef = useRef(0)

  const loadDetail = useCallback(() => {
    if (!item?.id) return

    const cached = readDetailCache(item.id)
    if (cached) {
      setDetail(cached)
      setDetailLoading(false)
      setDetailError(null)
      return
    }

    const fetchId = ++fetchRef.current
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)

    fetch('/.netlify/functions/media-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item: { title: item.title, creator: item.creator || '', type: item.type },
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (fetchRef.current !== fetchId) return
        writeDetailCache(item.id, data)
        setDetail(data)
        setDetailLoading(false)
      })
      .catch((err) => {
        if (fetchRef.current !== fetchId) return
        console.error('ItemLightbox media-detail fetch failed', err)
        setDetailError('More info unavailable right now.')
        setDetailLoading(false)
      })
  }, [item?.id, item?.title, item?.type, item?.creator])

  useEffect(() => {
    if (!isOpen || !item) return
    setActiveSuggestion(null)
    setDetail(null)
    loadDetail()
  }, [isOpen, item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e) => { if (e.key === 'Escape' && !activeSuggestion) onClose() }
    window.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, activeSuggestion, onClose])

  if (!isOpen || !item) return null

  const color = getMediaColor(item.type)
  const related = detail?.related || []
  const hasLowerContent = detail && (detail.description || detail.rating || related.length > 0)

  const handleStatus = (status) => {
    if (status === item.status) return
    // Finishing goes through the same celebratory path as the card's Finish
    // button (sets the completion date + fires the rate/thoughts prompt).
    if (status === 'finished') onFinish?.(item)
    else onUpdate?.(item.id, { status })
  }

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
        onClick={(e) => e.target === overlayRef.current && onClose()}
      >
        <div
          className="bg-bg-secondary border border-border rounded-2xl w-full shadow-2xl flex flex-col"
          style={{ maxWidth: '640px', maxHeight: '90vh' }}
        >
          {/* Modal header */}
          <div className="flex items-center justify-end px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              {onDelete && (
                <button
                  onClick={() => {
                    if (!confirmDelete) {
                      setConfirmDelete(true)
                      return
                    }
                    onDelete(item)
                    onClose()
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    confirmDelete
                      ? 'bg-accent-movies text-white hover:opacity-90'
                      : 'text-accent-movies hover:bg-accent-movies/10'
                  }`}
                >
                  <Trash2 size={13} />
                  {confirmDelete ? 'Really delete?' : 'Delete'}
                </button>
              )}
              <button
                onClick={() => onEdit(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
              >
                <Edit2 size={13} />
                Edit
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1">
            {/* Item details */}
            <div className="p-5 space-y-3">
              <div className="flex gap-4 items-start">
                <CoverArt
                  title={item.title}
                  type={item.type}
                  creator={item.creator}
                  coverUrl={item.coverUrl}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-xl font-bold text-text-primary leading-tight"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {item.title}
                  </h2>
                  {item.creator && (
                    <p className="text-sm text-text-secondary mt-1">{item.creator}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                    >
                      {TYPE_LABELS[item.type] || item.type}
                    </span>
                    {item.genre && (
                      <span className="text-xs text-text-muted">{item.genre}</span>
                    )}
                    {item.year && (
                      <span className="text-xs text-text-muted">{item.year}</span>
                    )}
                    {/* Critics rating — like the radar */}
                    {detail?.rating && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-amber-400/15 text-amber-400">
                        <Award size={11} />
                        {detail.rating.label}
                      </span>
                    )}
                    {item.hidden && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-bg-tertiary text-text-muted" title="Only you can see this item">
                        <EyeOff size={11} />
                        Hidden from profile
                      </span>
                    )}
                  </div>
                  {item.rating > 0 && (
                    <div className="mt-2">
                      <StarDisplay rating={item.rating} />
                    </div>
                  )}
                </div>
              </div>

              {/* Status picker — change it right here, no need to open Edit */}
              <div className="flex flex-wrap gap-1.5">
                {STATUS_PICKER.map((s) => {
                  const active = item.status === s.value
                  return (
                    <button
                      key={s.value}
                      onClick={() => handleStatus(s.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                        active ? 'border-transparent' : 'bg-bg-tertiary border-border text-text-muted hover:bg-bg-hover'
                      }`}
                      style={active ? { backgroundColor: `color-mix(in srgb, ${s.color} 22%, transparent)`, color: s.color } : {}}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>

              {item.review && (
                <div className="bg-bg-tertiary rounded-xl p-3.5">
                  <p className="text-sm text-text-secondary italic leading-relaxed">"{item.review}"</p>
                </div>
              )}

              <ExternalLinks type={item.type} title={item.title} creator={item.creator || ''} />
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Fast facts: About + Related */}
            <div className="p-5 space-y-5">
              {detailLoading && (
                <div className="flex items-center gap-2 py-6 justify-center text-text-muted text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Pulling details…
                </div>
              )}

              {!detailLoading && detailError && (
                <div className="py-4 text-center">
                  <p className="text-sm text-text-muted">{detailError}</p>
                  <button
                    onClick={loadDetail}
                    className="mt-2 text-xs text-accent-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!detailLoading && !detailError && detail && (
                <>
                  {/* About */}
                  {detail.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-1.5">About</h3>
                      <p className="text-sm text-text-secondary leading-relaxed">{detail.description}</p>
                    </div>
                  )}

                  {/* Related / More by */}
                  {related.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-2">
                        {related[0]?.note?.startsWith('More') ? related[0].note : 'Related'}
                      </h3>
                      <div className="space-y-2">
                        {related.map((suggestion, i) => (
                          <SuggestionCard
                            key={`${suggestion.title}-${i}`}
                            // "More by X" is already the section header — only show
                            // a per-row reason when it adds something (e.g. TMDB recs).
                            suggestion={{ ...suggestion, reason: suggestion.note?.startsWith('More') ? '' : suggestion.note }}
                            onOpen={setActiveSuggestion}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasLowerContent && (
                    <div className="py-4 text-center">
                      <p className="text-sm text-text-muted">No extra details found for this one.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Suggestion detail lightbox — z-index above item lightbox */}
      <SuggestionLightbox
        suggestion={activeSuggestion}
        onClose={() => setActiveSuggestion(null)}
        addItem={addItem}
      />
    </>
  )
}
