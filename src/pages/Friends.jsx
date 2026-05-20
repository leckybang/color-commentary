import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Search, UserPlus, UserMinus, MessageCircle, AtSign, ArrowRight } from 'lucide-react'
import { useFriends } from '../hooks/useFriends'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Friends() {
  const { following, followers, follow, unfollow, searchUsersAsync } = useFriends()
  const myProfile = usePublicProfile()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState('following')

  // Debounced async search
  useEffect(() => {
    if (searchQuery.length < 2) {
      Promise.resolve().then(() => {
        setSearchResults([])
        setSearching(false)
      })
      return
    }
    let cancelled = false
    Promise.resolve().then(() => setSearching(true))
    const timer = setTimeout(async () => {
      const results = await searchUsersAsync(searchQuery)
      if (!cancelled) {
        setSearchResults(results)
        setSearching(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // searchUsersAsync is recreated each render but stable wrt the data; listing it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Friends</h1>
        <p className="text-text-secondary">Find people with great taste and see what they're into.</p>
      </div>

      {/* Your username — so the user knows what to share with friends */}
      {myProfile.username ? (
        <div className="flex items-center gap-3 mb-4 p-3 bg-bg-secondary/50 border border-border/60 rounded-xl text-sm">
          <AtSign size={14} className="text-text-muted shrink-0" />
          <span className="text-text-muted">Share your handle:</span>
          <span className="text-text-primary font-mono font-medium">@{myProfile.username}</span>
          {!myProfile.isPublic && (
            <Link
              to="/me?tab=settings"
              className="ml-auto text-xs text-accent-primary hover:underline"
            >
              Profile is private — make public →
            </Link>
          )}
        </div>
      ) : (
        <div className="mb-4 p-3 bg-accent-primary/5 border border-accent-primary/20 rounded-xl text-sm">
          <p className="text-text-secondary">
            <span className="font-medium text-text-primary">Set up your profile first.</span>{' '}
            You need a username and a public profile so friends can find you.{' '}
            <Link to="/me?tab=settings" className="text-accent-primary hover:underline">Set up →</Link>
          </p>
        </div>
      )}

      {/* Search */}
      <div className="bg-bg-secondary border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Search size={18} className="text-accent-primary" />
          <h2 className="font-semibold text-text-primary">Find Friends</h2>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or username…"
            className="w-full bg-bg-tertiary border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
          />
        </div>
        <p className="text-[11px] text-text-muted mt-2">
          They have to have a username and a public profile to show up here.
        </p>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((u) => (
              <div key={u.userId} className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
                {u.avatarEmoji ? (
                  <div className="w-10 h-10 rounded-full bg-bg-primary flex items-center justify-center text-lg shrink-0">
                    {u.avatarEmoji}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-sm shrink-0">
                    {u.displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {u.username ? (
                    <Link to={`/u/${u.username}`} className="text-sm font-medium text-text-primary hover:underline truncate block">
                      {u.displayName}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-text-primary truncate">{u.displayName}</p>
                  )}
                  {u.username && <p className="text-xs text-text-muted truncate">@{u.username}</p>}
                </div>
                <button
                  onClick={() => follow(u)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors shrink-0"
                >
                  <UserPlus size={14} />
                  Follow
                </button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
          <div className="mt-3 p-3 bg-bg-tertiary/50 border border-border rounded-lg text-xs text-text-secondary leading-relaxed">
            {isSupabaseConfigured ? (
              <>
                <p className="font-medium text-text-primary mb-1">No matches for "{searchQuery}".</p>
                <p>
                  If you know they're signed up, double-check that{' '}
                  <span className="text-text-primary font-medium">they've set a username</span> and{' '}
                  <span className="text-text-primary font-medium">toggled "Make profile public"</span> in their Settings.
                  Private profiles don't show up in search.
                </p>
              </>
            ) : (
              <p>Full friend search requires online mode. Try "Alex", "Sam", or "Jordan" for demo users.</p>
            )}
          </div>
        )}
        {searching && searchQuery.length >= 2 && (
          <p className="text-xs text-text-muted mt-3 text-center italic">Searching…</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('following')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'following' ? 'bg-accent-primary/15 text-accent-primary' : 'text-text-secondary hover:bg-bg-hover'
          }`}
        >
          Following ({following.length})
        </button>
        <button
          onClick={() => setActiveTab('followers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'followers' ? 'bg-accent-primary/15 text-accent-primary' : 'text-text-secondary hover:bg-bg-hover'
          }`}
        >
          Followers ({followers.length})
        </button>
      </div>

      {/* Following list — each row links to /u/{username} */}
      {activeTab === 'following' && (
        <div>
          {following.length > 0 ? (
            <div className="space-y-2">
              {following.map((friend) => {
                const inner = (
                  <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center gap-4 hover:border-accent-primary/30 transition-colors">
                    {friend.avatarEmoji ? (
                      <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center text-xl shrink-0">
                        {friend.avatarEmoji}
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold shrink-0">
                        {friend.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{friend.displayName}</p>
                      {friend.username ? (
                        <p className="text-xs text-text-muted truncate">@{friend.username}</p>
                      ) : (
                        <p className="text-xs text-text-muted italic">No username</p>
                      )}
                    </div>
                    {friend.username && (
                      <ArrowRight size={16} className="text-text-muted shrink-0" />
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); unfollow(friend.userId) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-text-muted hover:text-accent-movies rounded-lg text-xs font-medium hover:bg-bg-hover transition-colors shrink-0"
                      title="Unfollow"
                    >
                      <UserMinus size={14} />
                      <span className="hidden sm:inline">Unfollow</span>
                    </button>
                  </div>
                )
                return friend.username ? (
                  <Link key={friend.userId} to={`/u/${friend.username}`} className="block">
                    {inner}
                  </Link>
                ) : (
                  <div key={friend.userId}>{inner}</div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-bg-secondary border border-border rounded-2xl">
              <Users size={32} className="mx-auto text-text-muted/30 mb-3" />
              <h3 className="text-text-secondary font-medium mb-1">Just you and the void in here</h3>
              <p className="text-text-muted text-sm">Search above to find people who also have opinions about movies at 2am.</p>
            </div>
          )}
        </div>
      )}

      {/* Followers list */}
      {activeTab === 'followers' && (
        <div>
          {followers.length > 0 ? (
            <div className="space-y-2">
              {followers.map((follower) => {
                const inner = (
                  <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center gap-4 hover:border-accent-primary/30 transition-colors">
                    {follower.avatarEmoji ? (
                      <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center text-xl shrink-0">
                        {follower.avatarEmoji}
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold shrink-0">
                        {follower.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{follower.displayName}</p>
                      {follower.username && <p className="text-xs text-text-muted truncate">@{follower.username}</p>}
                    </div>
                    {follower.username && <ArrowRight size={16} className="text-text-muted shrink-0" />}
                  </div>
                )
                return follower.username ? (
                  <Link key={follower.userId} to={`/u/${follower.username}`} className="block">
                    {inner}
                  </Link>
                ) : (
                  <div key={follower.userId}>{inner}</div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-bg-secondary border border-border rounded-2xl">
              <MessageCircle size={32} className="mx-auto text-text-muted/30 mb-3" />
              <h3 className="text-text-secondary font-medium mb-1">
                {isSupabaseConfigured ? 'No followers yet' : 'Coming with online mode'}
              </h3>
              <p className="text-text-muted text-sm">
                {isSupabaseConfigured
                  ? `Share @${myProfile.username || 'your handle'} to get followers!`
                  : 'Follower tracking requires Supabase. Set up online mode to unlock social features.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
