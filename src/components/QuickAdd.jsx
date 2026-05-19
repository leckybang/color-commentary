import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Headphones, Eye, BookOpen, Check, Plus, ArrowRight } from 'lucide-react'
import MediaPickerInput from './common/MediaPickerInput'
import { getMediaColor } from '../utils/filterUtils'

// Activity-framed rows. Each maps to the catalog media type(s) it searches.
const ROWS = [
  {
    key: 'listening',
    label: 'Listening to',
    icon: Headphones,
    color: 'var(--color-accent-music)',
    placeholder: 'An album, artist, or track…',
    preferredTypes: ['music'],
    defaultType: 'music',
  },
  {
    key: 'watching',
    label: 'Watching',
    icon: Eye,
    color: 'var(--color-accent-movies)',
    placeholder: 'A movie or show…',
    preferredTypes: ['movie', 'tv'],
    defaultType: 'movie',
  },
  {
    key: 'reading',
    label: 'Reading',
    icon: BookOpen,
    color: 'var(--color-accent-books)',
    placeholder: 'A book…',
    preferredTypes: ['book'],
    defaultType: 'book',
  },
]

const STATUS_CHOICES = [
  { value: 'want', label: 'Want to try' },
  { value: 'watching', label: 'In progress' },
  { value: 'finished', label: 'Finished' },
]

/**
 * QuickAdd — the dashboard/catalog entry point. Replaces the old Liner Notes
 * box: framed the same way ("what are you listening to / watching / reading")
 * but every entry creates a real catalog item.
 *
 * Props:
 *   addItem: (item) => newItem   — from useCatalog
 *   onAdded?: (newItem) => void  — optional hook for parent refresh
 */
export default function QuickAdd({ addItem, onAdded }) {
  const [status, setStatus] = useState('watching')
  // Per-row controlled input text so the field clears after a pick.
  const [drafts, setDrafts] = useState({ listening: '', watching: '', reading: '' })
  // Session list of what was just added, newest first.
  const [justAdded, setJustAdded] = useState([])

  const setDraft = (key, v) => setDrafts((d) => ({ ...d, [key]: v }))

  const commit = (row, result) => {
    const isText = result.kind === 'text'
    const type = isText ? row.defaultType : result.type || row.defaultType
    const payload = {
      title: result.title,
      creator: result.creator || '',
      type,
      coverUrl: result.coverUrl || '',
      year: result.year || '',
      status,
    }
    if (!payload.title.trim()) return
    const created = addItem(payload)
    setDraft(row.key, '')
    setJustAdded((prev) => [
      { id: created?.id || `${payload.title}-${Date.now()}`, title: payload.title, type, status },
      ...prev,
    ].slice(0, 6))
    onAdded?.(created)
  }

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Plus size={18} className="text-accent-primary" />
          <h2 className="font-semibold text-text-primary">Quick Add</h2>
        </div>
        {/* Status selector — applies to whatever you add next */}
        <div className="flex bg-bg-tertiary rounded-lg p-0.5">
          {STATUS_CHOICES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                status === s.value
                  ? 'bg-bg-secondary text-text-primary font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-text-muted mb-4">
        Whatever you're into right now — it goes straight to your catalog as{' '}
        <span className="text-text-secondary">
          {STATUS_CHOICES.find((s) => s.value === status)?.label.toLowerCase()}
        </span>.
      </p>

      <div className="space-y-4">
        {ROWS.map((row) => {
          const Icon = row.icon
          return (
            <div key={row.key}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={13} style={{ color: row.color }} />
                <span className="text-xs font-medium text-text-muted">{row.label}</span>
              </div>
              <MediaPickerInput
                value={drafts[row.key]}
                onChange={(v) => setDraft(row.key, v)}
                onPick={(result) => commit(row, result)}
                placeholder={row.placeholder}
                preferredTypes={row.preferredTypes}
              />
            </div>
          )
        })}
      </div>

      {justAdded.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
              Just added
            </span>
            <Link
              to="/catalog"
              className="text-xs text-accent-primary hover:underline flex items-center gap-1"
            >
              View catalog <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-1.5">
            {justAdded.map((it) => {
              const color = getMediaColor(it.type)
              return (
                <div key={it.id} className="flex items-center gap-2 text-sm">
                  <Check size={13} className="text-accent-books shrink-0" />
                  <span className="text-text-primary truncate flex-1 min-w-0">{it.title}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                  >
                    {it.type}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
