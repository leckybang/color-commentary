import { useEffect } from 'react'
import { Users } from 'lucide-react'
import FriendsPanel from '../components/FriendsPanel'
import FriendsFeedRows from '../components/FriendsFeedRows'
import { useFriendsFeed } from '../hooks/useFriendsFeed'
import { useCatalog } from '../hooks/useCatalog'
import { useNewFollowers } from '../hooks/useNewFollowers'
import { useReactionsOnMyItems } from '../hooks/useReactionsOnMyItems'

export default function Friends() {
  const feed = useFriendsFeed()
  const { items: ownItems, addItem } = useCatalog()
  const { markFollowersSeen } = useNewFollowers()
  const { reactions, markReactionsSeen } = useReactionsOnMyItems()

  // Visiting this page counts as seeing your followers and reactions —
  // clears the nav dot.
  useEffect(() => {
    markFollowersSeen()
    markReactionsSeen()
  }, [markFollowersSeen, markReactionsSeen])

  const inCatalog = (title, type) =>
    ownItems.some(
      (i) => i.type === type && i.title.trim().toLowerCase() === String(title).trim().toLowerCase()
    )

  return (
    <div>
      <div className="mb-6">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2.5px] text-text-muted mb-1.5">
          <span className="w-6 h-[3px] rounded-full bg-accent-primary inline-block" aria-hidden="true" />
          your people
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-2 tracking-tight">Friends</h1>
        <p className="text-text-secondary">Follow taste you trust and see what they're into lately.</p>
      </div>

      <FriendsPanel />

      {/* Reactions on your items — the "someone loved what I logged" moment */}
      {reactions.length > 0 && (
        <div className="ink-card bg-bg-secondary rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-1">On your items</h2>
          <p className="text-xs text-text-muted mb-3">Reactions from your people.</p>
          <div className="space-y-1.5">
            {reactions.slice(0, 6).map((r) => (
              <p key={r.id} className="text-sm text-text-secondary">
                <span className="mr-1">{r.emoji}</span>
                <span className="font-semibold text-text-primary">{r.reactorName}</span>
                {' reacted to '}
                <span className="font-semibold text-text-primary">{r.itemTitle}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Fresh from friends — recent catalog activity from people you follow */}
      <div className="ink-card bg-bg-secondary rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Users size={18} className="text-accent-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Fresh from friends</h2>
        </div>
        <p className="text-xs text-text-muted mb-3">
          What the people you follow have been adding, watching, and finishing. Tap Add to grab one for your own catalog.
        </p>
        {feed.items.length > 0 ? (
          <FriendsFeedRows items={feed.items} addItem={addItem} inCatalog={inCatalog} />
        ) : feed.loading ? (
          <p className="text-sm text-text-muted italic py-4 text-center">Checking in on your people…</p>
        ) : feed.hasFriends ? (
          <p className="text-sm text-text-muted italic py-4 text-center">
            Quiet so far: nothing from your friends yet. (Private profiles keep their catalogs to themselves.)
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
