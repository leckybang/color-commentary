import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Star, Plus, Check } from 'lucide-react'
import { getMediaColor } from '../utils/filterUtils'
import CoverArt from './common/CoverArt'
import { useItemReactions, REACTION_EMOJI } from '../hooks/useItemReactions'

const VERBS = {
  want: 'wants to try',
  watching: 'started',
  finished: 'finished',
  dropped: 'dropped',
}

function timeAgo(iso) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  return `${months}mo ago`
}

/**
 * One-tap copy of a friend's item into YOUR catalog (as "Want to Try").
 * Shows a quiet "Saved" state when you already have it.
 */
export function AddFromFriendButton({ item, addItem, inCatalog }) {
  if (!addItem || !inCatalog) return null
  if (inCatalog(item.title, item.type)) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-books shrink-0" title="Already in your log">
        <Check size={12} />
        Saved
      </span>
    )
  }
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        addItem({
          title: item.title,
          creator: item.creator || '',
          type: item.type,
          genre: item.genre || '',
          year: item.year || '',
          coverUrl: item.coverUrl || '',
          status: 'want',
        })
      }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent-primary text-white hover:bg-accent-hover transition-colors shrink-0"
      title="Add to your log (Want to Try)"
    >
      <Plus size={12} />
      Add
    </button>
  )
}

/**
 * FriendsFeedShelf — the horizontal version: a swipeable row of covers with
 * the friend's name, freshness, and compact reactions. Tap a tile to open
 * the detail lightbox (pass onItemClick from the page).
 */
export function FriendsFeedShelf({ items, onItemClick }) {
  const itemIds = useMemo(() => items.map((i) => i.id), [items])
  const { enabled: reactionsEnabled, counts, mine, toggle } = useItemReactions(itemIds)

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
      {items.map((item) => (
        <div
          key={item.id}
          className="w-28 shrink-0 cursor-pointer group"
          onClick={() => onItemClick?.(item)}
        >
          <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="lg" />
          <p className="text-xs font-medium text-text-primary truncate mt-1.5">{item.title}</p>
          <p className="text-[10px] text-text-muted truncate">
            {(item.displayName || 'Someone').split(' ')[0]} {VERBS[item.status] || 'added'} · {timeAgo(item.at)}
          </p>
          {reactionsEnabled && (
            <div className="flex items-center gap-1 mt-1">
              {REACTION_EMOJI.map((emoji) => {
                const count = counts[item.id]?.[emoji] || 0
                const isMine = mine.has(`${item.id}:${emoji}`)
                if (!isMine && count === 0) return null
                return (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggle(item.id, emoji)
                    }}
                    className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[10px] border ${
                      isMine
                        ? 'border-accent-primary/60 bg-accent-primary/15 text-accent-primary font-semibold'
                        : 'border-transparent bg-bg-tertiary/70 text-text-muted'
                    }`}
                  >
                    <span className="leading-none">{emoji}</span>
                    {count > 0 && <span className="leading-none">{count}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * FriendsFeedRows — recent friend activity rows, shared by the Friends tab
 * and the Dashboard module. Pass addItem + inCatalog (from ONE useCatalog
 * instance at the page level) to enable one-tap adding.
 */
export default function FriendsFeedRows({ items, addItem, inCatalog, compact = false, onItemClick }) {
  const itemIds = useMemo(() => items.map((i) => i.id), [items])
  const { enabled: reactionsEnabled, counts, mine, toggle } = useItemReactions(itemIds)

  return (
    <div>
      {items.map((item) => {
        const color = getMediaColor(item.type)
        const name = item.username ? (
          <Link to={`/u/${item.username}`} onClick={(e) => e.stopPropagation()} className="font-bold text-text-primary hover:text-accent-primary transition-colors">
            {item.displayName}
          </Link>
        ) : (
          <span className="font-bold text-text-primary">{item.displayName}</span>
        )
        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 ${compact ? 'py-2.5' : 'py-3'} border-b border-dotted border-border last:border-b-0 ${onItemClick ? 'cursor-pointer hover:bg-bg-tertiary/40 rounded-lg px-1 -mx-1 transition-colors' : ''}`}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
          >
            {!compact && (
              item.avatarEmoji ? (
                <div className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center text-lg shrink-0">
                  {item.avatarEmoji}
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-accent-primary/20 text-accent-primary text-sm font-bold flex items-center justify-center shrink-0">
                  {item.displayName?.[0]?.toUpperCase() || '?'}
                </div>
              )
            )}
            <CoverArt title={item.title} type={item.type} coverUrl={item.coverUrl} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-secondary leading-snug">
                {name} {VERBS[item.status] || 'added'}{' '}
                <span className="font-semibold text-text-primary">{item.title}</span>
                {!compact && item.creator ? <span className="text-text-muted"> · {item.creator}</span> : null}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`, color }}
                >
                  {item.type}
                </span>
                {item.rating > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                    <Star size={11} fill="currentColor" />
                    {item.rating}
                  </span>
                )}
                <span className="text-[11px] text-text-muted">{timeAgo(item.at)}</span>
              </div>
              {reactionsEnabled && (
                <div className="flex items-center gap-1 mt-1.5">
                  {REACTION_EMOJI.map((emoji) => {
                    const count = counts[item.id]?.[emoji] || 0
                    const isMine = mine.has(`${item.id}:${emoji}`)
                    if (!isMine && count === 0 && compact) return null
                    return (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggle(item.id, emoji)
                        }}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] transition-colors border ${
                          isMine
                            ? 'border-accent-primary/60 bg-accent-primary/15 text-accent-primary font-semibold'
                            : 'border-transparent bg-bg-tertiary/70 text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                        }`}
                        title={isMine ? 'Remove reaction' : 'React'}
                      >
                        <span className="leading-none">{emoji}</span>
                        {count > 0 && <span className="leading-none">{count}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <AddFromFriendButton item={item} addItem={addItem} inCatalog={inCatalog} />
          </div>
        )
      })}
    </div>
  )
}
