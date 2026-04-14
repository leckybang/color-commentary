import { Music, Film, Tv, BookOpen } from 'lucide-react'
import StarRating from './StarRating'
import CoverArt from './CoverArt'
import { getMediaColor, STATUS_OPTIONS } from '../../utils/filterUtils'

const TYPE_LABELS = {
  music: 'Music',
  movie: 'Movie',
  tv: 'TV',
  book: 'Book',
}

export default function MediaCard({ item, onUpdate, onDelete, onClick }) {
  const color = getMediaColor(item.type)
  const statusLabel = STATUS_OPTIONS.find((s) => s.value === item.status)?.label || item.status

  return (
    <div
      className="bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary/30 transition-all cursor-pointer group"
      onClick={() => onClick?.(item)}
    >
      <div className="flex items-start gap-3">
        <CoverArt title={item.title} type={item.type} creator={item.creator} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate">{item.title}</h3>
          {item.creator && (
            <p className="text-sm text-text-secondary truncate">{item.creator}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
            >
              {TYPE_LABELS[item.type]}
            </span>
            <span className="text-xs text-text-muted">{statusLabel}</span>
          </div>
          {item.rating > 0 && (
            <div className="mt-2">
              <StarRating rating={item.rating} readonly size={14} />
            </div>
          )}
        </div>
      </div>
      {item.review && (
        <p className="mt-3 pt-3 border-t border-border text-sm text-text-secondary line-clamp-2">{item.review}</p>
      )}
    </div>
  )
}
