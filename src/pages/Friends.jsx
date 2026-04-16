import { useState, useEffect } from 'react'
import { Users, Search, UserPlus, UserMinus, ArrowRight, MessageCircle } from 'lucide-react'
import { useFriends } from '../hooks/useFriends'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Friends() {
  const { following, followers, follow, unfollow, searchUsersAsync } = useFriends()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [activeTab, setActiveTab] = useState('following')

  // Debounced async search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const results = await searchUsersAsync(searchQuery)
      if (!cancelled) setSearchResults(results)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Friends</h1>
        <p className="text-text-secondary">Find people with great taste and see what they're into.</p>
      </div>

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
            placeholder="Search by name or email..."
            className="w-full bg-bg-tertiary border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((user) => (
              <div key={user.userId} className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
                <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-sm">
                  {user.displayName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{user.displayName}</p>
                  <p className="text-xs text-text-muted">{user.archetype}</p>
                </div>
                <button
                  onClick={() => follow(user)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary/10 text-accent-primary rounded-lg text-xs font-medium hover:bg-accent-primary/20 transition-colors"
                >
                  <UserPlus size={14} />
                  Follow
                </button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && (
          <p className="text-xs text-text-muted mt-3 text-center">
            {isSupabaseConfigured
              ? 'No users found matching your search.'
              : 'Full friend search requires online mode. Try "Alex", "Sam", or "Jordan" for demo users.'}
          </p>
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

      {/* Following list */}
      {activeTab === 'following' && (
        <div>
          {following.length > 0 ? (
            <div className="space-y-3">
              {following.map((friend) => (
                <div key={friend.userId} className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold">
                    {friend.displayName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary">{friend.displayName}</p>
                    <p className="text-xs text-text-muted">{friend.archetype || 'Media explorer'}</p>
                  </div>
                  <button
                    onClick={() => unfollow(friend.userId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-text-muted hover:text-accent-movies rounded-lg text-xs font-medium hover:bg-bg-hover transition-colors"
                  >
                    <UserMinus size={14} />
                    Unfollow
                  </button>
                </div>
              ))}
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
        <div className="text-center py-12 bg-bg-secondary border border-border rounded-2xl">
          <MessageCircle size={32} className="mx-auto text-text-muted/30 mb-3" />
          <h3 className="text-text-secondary font-medium mb-1">
            {isSupabaseConfigured ? 'No followers yet' : 'Coming with online mode'}
          </h3>
          <p className="text-text-muted text-sm">
            {isSupabaseConfigured
              ? 'Share your profile to get followers!'
              : 'Follower tracking requires Supabase. Set up online mode to unlock social features.'}
          </p>
        </div>
      )}
    </div>
  )
}
