import { useEffect } from 'react'
import { X, Sparkles, Plus, Check } from 'lucide-react'
import CoverArt from './common/CoverArt'
import ExternalLinks from './common/ExternalLinks'
import { getMediaColor } from '../utils/filterUtils'
import { useState } from 'react'

const TYPE_LABELS = { music: 'Music', movie: 'Movie', tv: 'TV', book: 'Book' }

export default function SuggestionLightbox({ suggestion, onClose, addItem }) {
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!suggestion) return
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [suggestion, onClose])

  if (!suggestion) return null

  const color = getMediaColor(suggestion.type)

  const handleAdd = () => {
    addItem({
      title: suggestion.title,
      creator: suggestion.creator || '',
      type: suggestion.type,
      genre: '',
      status: 'want',
    })
    setAdded(true)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-border rounded-2xl w-full shadow-2xl overflow-hidden"
        style={{ maxWidth: '420px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-primary" />
            <span className="text-sm font-medium text-text-secondary">Suggestion</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Item identity */}
          <div className="flex gap-4 items-start">
            <CoverArt
              title={suggestion.title}
              type={suggestion.type}
              creator={suggestion.creator}
              coverUrl={suggestion.coverUrl}
              size="lg"
            />
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-lg font-semibold text-text-primary leading-tight">{suggestion.title}</h2>
              {suggestion.creator && (
                <p className="text-sm text-text-secondary mt-1">{suggestion.creator}</p>
              )}
              <span
                className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
              >
                {TYPE_LABELS[suggestion.type] || suggestion.type}
              </span>
            </div>
          </div>

          {/* Why this suggestion */}
          {suggestion.reason && (
            <div className="flex items-start gap-2.5 bg-accent-primary/5 border border-accent-primary/15 rounded-xl p-3.5">
              <Sparkles size={14} className="text-accent-primary mt-0.5 shrink-0" />
              <p className="text-sm text-text-secondary leading-relaxed italic">{suggestion.reason}</p>
            </div>
          )}

          {/* External links */}
          <div>
            <p className="text-xs font-medium text-text-muted mb-2">Find it on</p>
            <ExternalLinks type={suggestion.type} title={suggestion.title} creator={suggestion.creator || ''} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          {added ? (
            <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-accent-books bg-accent-books/10">
              <Check size={15} />
              Added to Catalog
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
            >
              <Plus size={15} />
              Add to Catalog
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
