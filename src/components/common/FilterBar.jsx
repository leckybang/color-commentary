import { Search, SlidersHorizontal } from 'lucide-react'
import { MEDIA_TYPES, STATUS_OPTIONS } from '../../utils/filterUtils'

export default function FilterBar({ filters, onChange, sortBy, onSortChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search titles, creators..."
          value={filters.search || ''}
          onChange={(e) => update('search', e.target.value)}
          className="w-full bg-bg-tertiary border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
        />
      </div>

      <select
        value={filters.type || 'all'}
        onChange={(e) => update('type', e.target.value)}
        className="bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
      >
        <option value="all">All Types</option>
        {MEDIA_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <select
        value={filters.status || 'all'}
        onChange={(e) => update('status', e.target.value)}
        className="bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
      >
        <option value="all">All Status</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
      >
        <option value="dateAdded">Newest First</option>
        <option value="rating">Highest Rated</option>
        <option value="title">A-Z</option>
      </select>
    </div>
  )
}
