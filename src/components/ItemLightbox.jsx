/**
 * ItemLightbox — rich per-catalog-item modal with Deeper / Further / Fresher tabs.
 *
 * Opens when a user clicks a catalog item. Shows item details at the top, then
 * three AI-generated suggestion tabs below. Suggestions are cached in localStorage
 * per item ID (7-day TTL). An "Edit" button hands back to the parent's edit modal.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Edit2, RefreshCw, Layers, Compass, Zap, Loader2, Music, Film, Tv, BookOpen, Star } from 'lucide-react'
import CoverArt from './common/CoverArt'
import ExternalLinks from './common/ExternalLinks'
import SuggestionLightbox from './SuggestionLightbox'
import { getMediaColor } from '../utils/filterUtils'

const DFF_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const TYPE_ICONS = { music: Music, movie: Film, tv: Tv, book: BookOpen }
const TYPE_LABELS = { music: 'Music', movie: 'Movie', tv: 'TV', book: 'Book' }
const STATUS_LABELS = { want: 'Want to Try', watching: 'In Progress', finished: 'Finished', dropped: 'Dropped' }

const TABS = [
  { id: 'deeper', label: 'Deeper', Icon: Layers, description: 'Context, influences, companion works' },
  { id: 'further', label: 'Further', Icon: Compass, description: 'Same vibe, different world' },
  { id: 'fresher', label: 'Wild Cards', Icon: Zap, description: 'Surprising lateral moves — the real connection is there' },
]

function dffCacheKey(itemId) {
  return `cc_dff_v3_${itemId}`
}

function readDffCache(itemId) {
  try {
    const raw = localStorage.getItem(dffCacheKey(itemId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.cachedAt || !parsed.data) return null
    if (Date.now() - parsed.cachedAt > DFF_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeDffCache(itemId, data) {
  try {
    localStorage.setItem(dffCacheKey(itemId), JSON.stringify({ data, cachedAt: Date.now() }))
  } catch {}
}

function clearDffCache(itemId) {
  try {
    localStorage.removeItem(dffCacheKey(itemId))
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

export default function ItemLightbox({ item, isOpen, onClose, onEdit, addItem }) {
  const [activeTab, setActiveTab] = useState('deeper')
  const [dff, setDff] = useState(null)
  const [dffLoading, setDffLoading] = useState(false)
  const [dffError, setDffError] = useState(null)
  const [activeSuggestion, setActiveSuggestion] = useState(null)
  const overlayRef = useRef(null)
  const fetchRef = useRef(0)

  // Load DFF on open
  const loadDff = useCallback((forceRefresh = false) => {
    if (!item?.id) return
    if (forceRefresh) clearDffCache(item.id)

    const cached = !forceRefresh && readDffCache(item.id)
    if (cached) {
      setDff(cached)
      setDffLoading(false)
      setDffError(null)
      return
    }

    const fetchId = ++fetchRef.current
    setDffLoading(true)
    setDffError(null)
    setDff(null)

    fetch('/.netlify/functions/claude-dff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item: {
          title: item.title,
          creator: item.creator || '',
          type: item.type,
          genre: item.genre || '',
          rating: item.rating || 0,
          review: item.review || '',
        },
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (fetchRef.current !== fetchId) return
        writeDffCache(item.id, data)
        setDff(data)
        setDffLoading(false)
      })
      .catch((err) => {
        if (fetchRef.current !== fetchId) return
        console.error('ItemLightbox DFF fetch failed', err)
        setDffError('Suggestions unavailable right now.')
        setDffLoading(false)
      })
  }, [item?.id, item?.title, item?.type])

  useEffect(() => {
    if (!isOpen || !item) return
    setActiveTab('deeper')
    setActiveSuggestion(null)
    setDff(null)
    loadDff(false)
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
  const activeDff = dff?.[activeTab] || []

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
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <span className="text-sm font-medium text-text-muted">
              {STATUS_LABELS[item.status] || item.status}
            </span>
            <div className="flex items-center gap-2">
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
                    style={{ fontFamily: "'Libre Baskerville', serif" }}
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
                  </div>
                  {item.rating > 0 && (
                    <div className="mt-2">
                      <StarDisplay rating={item.rating} />
                    </div>
                  )}
                </div>
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

            {/* D/F/F section */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Go Further</h3>
                <button
                  onClick={() => loadDff(true)}
                  disabled={dffLoading}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={12} className={dffLoading ? 'animate-spin' : ''} />
                  Regenerate
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-bg-tertiary rounded-xl p-1">
                {TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === id
                        ? 'bg-bg-secondary text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab description */}
              <p className="text-xs text-text-muted">
                {TABS.find((t) => t.id === activeTab)?.description}
              </p>

              {/* Tab content */}
              {dffLoading && (
                <div className="flex items-center gap-2 py-6 justify-center text-text-muted text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Thinking…
                </div>
              )}

              {!dffLoading && dffError && (
                <div className="py-6 text-center">
                  <p className="text-sm text-text-muted">{dffError}</p>
                  <button
                    onClick={() => loadDff(true)}
                    className="mt-3 text-xs text-accent-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!dffLoading && !dffError && dff && activeDff.length > 0 && (
                <div className="space-y-2">
                  {activeDff.map((suggestion, i) => (
                    <SuggestionCard
                      key={`${suggestion.title}-${i}`}
                      suggestion={suggestion}
                      onOpen={setActiveSuggestion}
                    />
                  ))}
                </div>
              )}

              {!dffLoading && !dffError && dff && activeDff.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm text-text-muted">No suggestions for this tab.</p>
                </div>
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
