import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { MEDIA_TYPES, STATUS_OPTIONS } from '../../utils/filterUtils'

export default function FilterBar({ filters, onChange, sortBy, onSortChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value })

  const filtersInUse =
    !!(filters.type && filters.type !== 'all') ||
    !!(filters.status && filters.status !== 'all') ||
    sortBy !== 'dateAdded'
  const [open, setOpen] = useState(false)

  const selectCls =
    'bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer'

  return (
    <div>
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search your catalog..."
            value={filters.search || ''}
            onChange={(e) => update('search', e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
          />
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`relative shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            open
              ? 'border-accent-primary/50 bg-accent-primary/10 text-accent-primary'
              : 'border-border bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
          aria-expanded={open}
        >
          <SlidersHorizontal size={14} />
          Filter
          {filtersInUse && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-primary" aria-hidden="true" />
          )}
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap gap-2 mt-2">
          <select value={filters.type || 'all'} onChange={(e) => update('type', e.target.value)} className={selectCls}>
            <option value="all">All Types</option>
            {MEDIA_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select value={filters.status || 'all'} onChange={(e) => update('status', e.target.value)} className={selectCls}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select value={sortBy} onChange={(e) => onSortChange(e.target.value)} className={selectCls}>
            <option value="dateAdded">Newest First</option>
            <option value="rating">Highest Rated</option>
            <option value="title">A-Z</option>
          </select>
        </div>
      )}
    </div>
  )
}
