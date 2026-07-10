import { Link } from 'react-router-dom'
import { Star, Sparkles } from 'lucide-react'
import FriendsPanel from '../components/FriendsPanel'
import { useFriendsFeed } from '../hooks/useFriendsFeed'
import { getMediaColor } from '../utils/filterUtils'
import CoverArt from '../components/common/CoverArt'

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

function FeedRow({ item }) {
  const color = getMediaColor(item.type)
  const name = item.username ? (
    <Link to={`/u/${item.username}`} className="font-bold text-text-primary hover:text-accent-primary transition-colors">
      {item.displayName}
    </Link>
  ) : (
    <span className="font-bold text-text-primary">{item.displayName}</span>
  )
  return (
    <div className="flex items-center gap-3.5 py-3 border-b border-dotted border-border last:border-b-0">
      {item.avatarEmoji ? (
        <div className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center text-lg shrink-0">
          {item.avatarEmoji}
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full bg-accent-primary/20 text-accent-primary text-sm font-bold flex items-center justify-center shrink-0">
          {item.displayName?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      <CoverArt title={item.title} type={item.type} coverUrl={item.coverUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-secondary leading-snug">
          {name} {VERBS[item.status] || 'added'}{' '}
          <span className="font-semibold text-text-primary">{item.title}</span>
          {item.creator ? <span className="text-text-muted"> · {item.creator}</span> : null}
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
      </div>
    </div>
  )
}

export default function Friends() {
  const feed = useFriendsFeed()

  return (
    <div>
      <div className="mb-6">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2.5px] text-text-muted mb-1.5">
          <span className="w-6 h-[3px] rounded-full bg-accent-primary inline-block" aria-hidden="true" />
          your people
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-2 tracking-tight">Friends</h1>
        <p className="text-text-secondary">Follow taste you trust — and see what they're into lately.</p>
      </div>

      <FriendsPanel />

      {/* Fresh from friends — recent catalog activity from people you follow */}
      <div className="ink-card bg-bg-secondary rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-accent-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Fresh from friends</h2>
        </div>
        <p className="text-xs text-text-muted mb-3">
          What the people you follow have been adding, watching, and finishing.
        </p>
        {feed.items.length > 0 ? (
          <div>
            {feed.items.map((item) => (
              <FeedRow key={item.id} item={item} />
            ))}
          </div>
        ) : feed.loading ? (
          <p className="text-sm text-text-muted italic py-4 text-center">Checking in on your people…</p>
        ) : feed.hasFriends ? (
          <p className="text-sm text-text-muted italic py-4 text-center">
            Quiet so far — nothing from your friends yet. (Private profiles keep their catalogs to themselves.)
          </p>
        ) : (
          <p className="text-sm text-text-muted italic py-4 text-center">
            Follow someone above and their latest adds and finishes show up here.
          </p>
        )}
      </div>
    </div>
  )
}
