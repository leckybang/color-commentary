import { Music, Film, Tv, BookOpen, Check } from 'lucide-react'
import StarRating from '../common/StarRating'
import { getMediaColor } from '../../utils/filterUtils'

const TYPE_ICONS = { music: Music, movie: Film, tv: Tv, book: BookOpen }
const TYPE_LABELS = { music: 'Music', movie: 'Movie', tv: 'TV', book: 'Book' }
const SECTIONS = [
  { key: 'listening', label: 'Listening' },
  { key: 'watching', label: 'Watching' },
  { key: 'reading', label: 'Reading' },
  { key: 'discovered', label: 'Discovered' },
]

const CONFIDENCE_COLORS = {
  high: 'var(--color-accent-books)',
  medium: '#f59e0b',
  low: 'var(--color-text-muted)',
}

export default function AIParsedItemCard({ item, onChange, onRemove }) {
  const Icon = TYPE_ICONS[item.type] || Film
  const color = getMediaColor(item.type)

  const update = (field, value) => onChange({ ...item, [field]: value })

  return (
    <div
      className={`border rounded-xl p-4 transition-all ${item.included ? 'bg-bg-secondary border-border' : 'bg-bg-primary border-border/50 opacity-60'}`}
    >
      {/* Header with include toggle */}
      <div className="flex items-start gap-3 mb-3">
        <button
          onClick={() => update('included', !item.included)}
          className={`w-5 h-5 rounded shrink-0 flex items-center justify-center transition-colors ${item.included ? 'bg-accent-primary text-white' : 'border border-border'}`}
        >
          {item.included && <Check size={12} />}
        </button>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={item.title}
              onChange={(e) => update('title', e.target.value)}
              className="flex-1 bg-transparent border-0 text-sm font-medium text-text-primary focus:outline-none focus:bg-bg-tertiary rounded px-1"
            />
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider shrink-0"
              style={{ backgroundColor: `${CONFIDENCE_COLORS[item.confidence]}20`, color: CONFIDENCE_COLORS[item.confidence] }}
            >
              {item.confidence}
            </span>
          </div>
          <input
            type="text"
            value={item.creator || ''}
            placeholder="Creator (artist, director, author...)"
            onChange={(e) => update('creator', e.target.value)}
            className="w-full bg-transparent border-0 text-xs text-text-muted focus:outline-none focus:bg-bg-tertiary rounded px-1 mt-0.5"
          />
        </div>
      </div>

      {item.included && (
        <div className="space-y-3 pl-8">
          {/* Type + section controls */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Type</label>
              <select
                value={item.type}
                onChange={(e) => update('type', e.target.value)}
                className="w-full bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Section</label>
              <select
                value={item.section}
                onChange={(e) => update('section', e.target.value)}
                className="w-full bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
              >
                {SECTIONS.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rating + catalog toggle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Rating:</span>
              <StarRating
                rating={item.rating || 0}
                onChange={(r) => update('rating', r)}
                size={16}
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={item.addToCatalog || false}
                onChange={(e) => update('addToCatalog', e.target.checked)}
                className="accent-accent-primary"
              />
              Also add to catalog
            </label>
          </div>

          {/* Notes (editable) */}
          {item.notes !== null && item.notes !== undefined && (
            <div>
              <input
                type="text"
                value={item.notes || ''}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Quick note..."
                className="w-full bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent-primary italic"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
