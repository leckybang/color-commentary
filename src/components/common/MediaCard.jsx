import { ExternalLink, Music, Film, Tv, BookOpen } from 'lucide-react'
import StarRating from './StarRating'
import CoverArt from './CoverArt'
import { getMediaColor, STATUS_OPTIONS } from '../../utils/filterUtils'
import { getMediaLinks } from '../../utils/mediaLinks'

const TYPE_LABELS = {
  music: 'Music',
  movie: 'Movie',
  tv: 'TV',
  book: 'Book',
}

export default function MediaCard({ item, onUpdate, onDelete, onClick }) {
  const color = getMediaColor(item.type)
  const statusLabel = STATUS_OPTIONS.find((s) => s.value === item.status)?.label || item.status
  // Surface "find it on" links directly on Want-to-Try cards so users can jump
  // to Spotify/Apple/Amazon/Bookshop without first opening the edit modal.
  const showQuickLinks = item.status === 'want' && item.type && item.title
  const quickLinks = showQuickLinks ? getMediaLinks(item.type, item.title, item.creator || '') : []

  return (
    <div
      className="bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary/30 transition-all cursor-pointer group"
      onClick={() => onClick?.(item)}
    >
      <div className="flex items-start gap-3">
        <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="md" />
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
      {quickLinks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
          {quickLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <ExternalLink size={10} />
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
