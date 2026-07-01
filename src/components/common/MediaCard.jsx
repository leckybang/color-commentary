import { useState } from 'react'
import { ExternalLink, Music, Film, Tv, BookOpen, Play, Check, RotateCcw, MoreHorizontal, X } from 'lucide-react'
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

// The natural "next step" for the core loop: Want → In Progress → Finished.
function PrimaryAction({ item, onUpdate, onFinish }) {
  const stop = (e) => e.stopPropagation()

  if (item.status === 'want') {
    return (
      <button
        onClick={(e) => { stop(e); onUpdate?.(item.id, { status: 'watching' }) }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-tv/15 text-accent-tv hover:bg-accent-tv/25 transition-all active:scale-95"
      >
        <Play size={13} fill="currentColor" />
        Start
      </button>
    )
  }
  if (item.status === 'watching') {
    return (
      <button
        onClick={(e) => { stop(e); onFinish?.(item) }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-books/15 text-accent-books hover:bg-accent-books/25 transition-all active:scale-95"
      >
        <Check size={13} strokeWidth={3} />
        Finish
      </button>
    )
  }
  if (item.status === 'finished') {
    return (
      <button
        onClick={(e) => { stop(e); onUpdate?.(item.id, { status: 'watching' }) }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
      >
        <RotateCcw size={12} />
        Revisit
      </button>
    )
  }
  // dropped
  return (
    <button
      onClick={(e) => { stop(e); onUpdate?.(item.id, { status: 'watching' }) }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
    >
      <RotateCcw size={12} />
      Pick back up
    </button>
  )
}

export default function MediaCard({ item, onUpdate, onFinish, onClick }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const color = getMediaColor(item.type)
  // Surface "find it on" links directly on Want-to-Try cards so users can jump
  // to Spotify/Apple/Amazon/Bookshop without first opening the edit modal.
  const showQuickLinks = item.status === 'want' && item.type && item.title
  const quickLinks = showQuickLinks ? getMediaLinks(item.type, item.title, item.creator || '') : []

  const setStatus = (status) => {
    setMenuOpen(false)
    if (status === item.status) return
    if (status === 'finished') {
      onFinish?.(item)
    } else {
      onUpdate?.(item.id, { status })
    }
  }

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

      {/* Status action bar — the core loop, one tap from the card */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
        <PrimaryAction item={item} onUpdate={onUpdate} onFinish={onFinish} />

        {/* Overflow menu for off-path moves (Dropped, jump back, etc.) */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
            title="Change status"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <>
              {/* click-away backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }}
              />
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-full mb-1 z-20 w-40 bg-bg-secondary border border-border rounded-xl shadow-xl py-1"
              >
                <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-text-muted">Move to</p>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value)}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-bg-hover transition-colors ${
                      s.value === item.status ? 'text-accent-primary font-medium' : 'text-text-secondary'
                    }`}
                  >
                    {s.label}
                    {s.value === item.status && <Check size={12} />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

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
