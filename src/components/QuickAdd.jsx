import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Music, Film, Tv, BookOpen, Check, Plus, ArrowRight, X } from 'lucide-react'
import MediaPickerInput from './common/MediaPickerInput'
import { getMediaColor } from '../utils/filterUtils'

// Media-type rows — same Music / Movies / TV / Books split as the
// "Someone Told Me About..." card, so entry feels consistent everywhere.
const ROWS = [
  {
    key: 'music',
    label: 'Music',
    icon: Music,
    color: 'var(--color-accent-music)',
    placeholder: 'An album, artist, or track…',
    preferredTypes: ['music'],
    defaultType: 'music',
  },
  {
    key: 'movie',
    label: 'Movies',
    icon: Film,
    color: 'var(--color-accent-movies)',
    placeholder: 'A movie…',
    preferredTypes: ['movie'],
    defaultType: 'movie',
  },
  {
    key: 'tv',
    label: 'TV',
    icon: Tv,
    color: 'var(--color-accent-tv)',
    placeholder: 'A show…',
    preferredTypes: ['tv'],
    defaultType: 'tv',
  },
  {
    key: 'book',
    label: 'Books',
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
 * QuickAdd — compact entry point.
 *
 * UX: four small pills (Music / Movies / TV / Books). Click one to
 * expand into an inline panel with: status toggle, search input, optional
 * genre. After an add, the panel collapses back to pills.
 *
 * Props:
 *   addItem: (item) => newItem   — from useCatalog
 *   onAdded?: (newItem) => void
 */
export default function QuickAdd({ addItem, onAdded }) {
  const [openKey, setOpenKey] = useState(null) // which row's panel is open
  const [draft, setDraft] = useState('')
  const [genre, setGenre] = useState('')
  const [status, setStatus] = useState('watching')
  const [pickedMeta, setPickedMeta] = useState(null)
  const [justAdded, setJustAdded] = useState([])
  const panelRef = useRef(null)

  const activeRow = ROWS.find((r) => r.key === openKey) || null

  // Close panel on outside click / Escape.
  useEffect(() => {
    if (!openKey) return
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpenKey(null)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpenKey(null) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [openKey])

  const openPill = (key) => {
    setOpenKey(key)
    setDraft('')
    setGenre('')
    setPickedMeta(null)
  }

  const commit = (row, result) => {
    const isText = result.kind === 'text'
    const type = isText ? row.defaultType : (result.type || row.defaultType)
    const payload = {
      title: result.title,
      creator: result.creator || pickedMeta?.creator || '',
      type,
      coverUrl: result.coverUrl || pickedMeta?.coverUrl || '',
      year: result.year || pickedMeta?.year || '',
      genre: genre || '',
      status,
    }
    if (!payload.title.trim()) return
    const created = addItem(payload)
    setJustAdded((prev) => [
      { id: created?.id || `${payload.title}-${Date.now()}`, title: payload.title, type, status },
      ...prev,
    ].slice(0, 5))
    setDraft('')
    setGenre('')
    setPickedMeta(null)
    setOpenKey(null)
    onAdded?.(created)
  }

  const handlePick = (result) => {
    if (result.kind === 'text') {
      setPickedMeta(null)
      setDraft(result.title)
    } else {
      setPickedMeta(result)
      setDraft(result.title)
    }
  }

  // Plain text → addItem on Enter (the picker already does this via onPick
  // with kind:'text'); covered by commit.

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-4 relative">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-accent-primary" />
          <h2 className="font-semibold text-text-primary text-sm">Quick Add</h2>
        </div>
        <span className="text-[11px] text-text-muted">Tap a pill to log something fast.</span>
      </div>

      {/* Compact pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ROWS.map((row) => {
          const Icon = row.icon
          const isOpen = openKey === row.key
          return (
            <button
              key={row.key}
              onClick={() => (isOpen ? setOpenKey(null) : openPill(row.key))}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
              style={{
                borderColor: isOpen ? `color-mix(in srgb, ${row.color} 55%, transparent)` : 'var(--color-border)',
                backgroundColor: isOpen ? `color-mix(in srgb, ${row.color} 12%, transparent)` : 'transparent',
                color: isOpen ? row.color : 'var(--color-text-secondary)',
              }}
            >
              <Icon size={14} />
              {row.label}
            </button>
          )
        })}
      </div>

      {/* Expanded panel */}
      {activeRow && (
        <div
          ref={panelRef}
          className="mt-3 p-3 rounded-xl border"
          style={{ borderColor: `color-mix(in srgb, ${activeRow.color} 40%, transparent)`, backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          {/* Status toggle */}
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex bg-bg-secondary rounded-lg p-0.5">
              {STATUS_CHOICES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
                    status === s.value ? 'bg-bg-tertiary text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpenKey(null)}
              className="p-1 rounded text-text-muted hover:text-text-secondary"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Search */}
          <MediaPickerInput
            value={draft}
            onChange={(v) => {
              setDraft(v)
              if (pickedMeta && v !== pickedMeta.title) setPickedMeta(null)
            }}
            onPick={(result) => {
              // If user picks from the dropdown, capture meta but DON'T commit
              // yet — they may still want to set a genre. Pressing Enter on
              // free text commits immediately. Detect "free text" via kind.
              if (result.kind === 'text') {
                commit(activeRow, result)
              } else {
                handlePick(result)
              }
            }}
            placeholder={activeRow.placeholder}
            preferredTypes={activeRow.preferredTypes}
            autoFocus
          />

          {/* Genre + Save row */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="Genre (optional)"
              className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
            />
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => commit(activeRow, { kind: pickedMeta ? 'media' : 'text', title: draft, ...(pickedMeta || {}) })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: activeRow.color }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Just-added confirmation */}
      {justAdded.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              Just added
            </span>
            <Link
              to="/catalog"
              className="text-[11px] text-accent-primary hover:underline flex items-center gap-0.5"
            >
              View catalog <ArrowRight size={10} />
            </Link>
          </div>
          <div className="space-y-1">
            {justAdded.map((it) => {
              const color = getMediaColor(it.type)
              return (
                <div key={it.id} className="flex items-center gap-2 text-xs">
                  <Check size={11} className="text-accent-books shrink-0" />
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
