import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Search, UserPlus, UserMinus, ArrowUpRight, Loader2 } from 'lucide-react'
import { useFriends } from '../hooks/useFriends'
import { usePublicProfile } from '../hooks/usePublicProfile'

function Avatar({ emoji, name, size = 'md' }) {
  const cls = size === 'md' ? 'w-10 h-10 text-xl' : 'w-8 h-8 text-base'
  return emoji ? (
    <div className={`${cls} rounded-full bg-bg-tertiary flex items-center justify-center shrink-0`}>{emoji}</div>
  ) : (
    <div className={`${cls} rounded-full bg-accent-primary/20 text-accent-primary font-bold flex items-center justify-center shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function PersonRow({ person, action }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-dotted border-border last:border-b-0">
      <Avatar emoji={person.avatarEmoji} name={person.displayName} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{person.displayName}</p>
        <p className="text-xs text-text-muted truncate">
          {person.username ? `@${person.username}` : 'no username yet'}
          {person.archetype ? ` · ${person.archetype}` : ''}
        </p>
      </div>
      {action}
    </div>
  )
}

/**
 * FriendsPanel — find people, follow them, and jump to their public profiles.
 * Lives on the owner's Profile tab. Search hits public Supabase profiles
 * (mock users in demo mode), follows sync via the follows table.
 */
export default function FriendsPanel() {
  const friends = useFriends()
  const publicProfile = usePublicProfile()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchSeq = useRef(0)

  const findable = publicProfile.isPublic && publicProfile.username

  // Debounced live search
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const seq = ++searchSeq.current
    const t = setTimeout(async () => {
      const found = await friends.searchUsersAsync(q)
      if (searchSeq.current !== seq) return // a newer search superseded this one
      setResults(found)
      setSearching(false)
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, friends.following.length])

  const followingIds = new Set(friends.following.map((f) => f.userId))
  const followBack = friends.followers.filter((f) => !followingIds.has(f.userId))

  return (
    <div className="ink-card bg-bg-secondary rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Users size={20} className="text-accent-primary" />
        <h2 className="text-lg font-semibold text-text-primary">Friends</h2>
      </div>
      <p className="text-xs text-text-muted mb-4">
        Find your people, follow them, and snoop their taste (the public parts, anyway).
      </p>

      {/* Findability nudge — you can follow others regardless, but nobody can
          find YOU until you're public with a username. */}
      {!findable && (
        <div className="rounded-xl border-[1.5px] border-text-primary bg-accent-primary/10 p-3.5 mb-4 flex items-start gap-2.5">
          <UserPlus size={15} className="text-accent-primary mt-0.5 shrink-0" />
          <div className="flex-1 text-xs text-text-secondary">
            <p className="font-semibold text-text-primary mb-0.5">Make yourself findable</p>
            {publicProfile.username
              ? 'Your profile is private, so friends can’t find or view you yet. Flip it public in Settings.'
              : 'Pick a username and make your profile public so friends can find you.'}
          </div>
          <Link
            to="/me?tab=settings"
            className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)' }}
          >
            Settings
          </Link>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-1">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or @username…"
          className="w-full bg-bg-tertiary border border-border rounded-full pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
        />
        {searching && (
          <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted animate-spin" />
        )}
      </div>

      {/* Search results */}
      {query.trim() && !searching && (
        results.length > 0 ? (
          <div className="mb-2">
            {results.map((p) => (
              <PersonRow
                key={p.userId}
                person={p}
                action={
                  <button
                    onClick={() => {
                      friends.follow(p)
                      setResults((prev) => prev.filter((r) => r.userId !== p.userId))
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-accent-primary text-white hover:bg-accent-hover transition-colors shrink-0"
                  >
                    <UserPlus size={13} />
                    Follow
                  </button>
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted italic py-3">
            No one found. They need a public profile with that name or username.
          </p>
        )
      )}

      {/* Following */}
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-[2px] text-text-muted mb-1">
          Following · {friends.following.length}
        </p>
        {friends.following.length > 0 ? (
          friends.following.map((f) => (
            <PersonRow
              key={f.userId}
              person={f}
              action={
                <div className="flex items-center gap-1.5 shrink-0">
                  {f.username && (
                    <Link
                      to={`/u/${f.username}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                      style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)' }}
                    >
                      View <ArrowUpRight size={12} />
                    </Link>
                  )}
                  <button
                    onClick={() => friends.unfollow(f.userId)}
                    className="p-1.5 rounded-full text-text-muted hover:text-accent-movies hover:bg-bg-hover transition-colors"
                    title={`Unfollow ${f.displayName}`}
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              }
            />
          ))
        ) : (
          <p className="text-xs text-text-muted italic py-2">
            Nobody yet. Search above and be the friend who makes the first move.
          </p>
        )}
      </div>

      {/* Followers who you don't follow back */}
      {followBack.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-[2px] text-text-muted mb-1">
            Follows you
          </p>
          {followBack.map((f) => (
            <PersonRow
              key={f.userId}
              person={f}
              action={
                <button
                  onClick={() => friends.follow(f)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border-[1.5px] border-text-primary text-text-primary hover:bg-bg-hover transition-colors shrink-0"
                >
                  <UserPlus size={13} />
                  Follow back
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
