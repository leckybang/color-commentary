import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { User, SlidersHorizontal, Settings, LogOut, Mail, Check, Save, Globe } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePublicProfile } from '../hooks/usePublicProfile'
import { isSupabaseConfigured } from '../lib/supabase'
import EmojiPicker from '../components/common/EmojiPicker'
import PublicProfile from './PublicProfile'
import Profile from './Profile'

const TABS = [
  { key: 'profile', label: 'Profile', icon: User, mobileLabel: 'Profile' },
  { key: 'taste', label: 'Taste', icon: SlidersHorizontal, mobileLabel: 'Taste' },
  { key: 'settings', label: 'Settings', icon: Settings, mobileLabel: 'Settings' },
]

export default function MyProfile() {
  const [params, setParams] = useSearchParams()
  const { user, logout } = useAuth()
  const publicProfile = usePublicProfile()

  const initialTab = TABS.find(t => t.key === params.get('tab'))?.key || 'profile'
  const [activeTab, setActiveTab] = useState(initialTab)

  // Public profile local drafts
  const [usernameDraft, setUsernameDraft] = useState('')
  const [bioDraft, setBioDraft] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    setUsernameDraft(publicProfile.username || '')
    setBioDraft(publicProfile.bio || '')
  }, [publicProfile.username, publicProfile.bio])

  // Sync tab to URL
  useEffect(() => {
    const current = params.get('tab')
    if (current !== activeTab) {
      setParams({ tab: activeTab }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const hasProfileChanges =
    usernameDraft !== (publicProfile.username || '') ||
    bioDraft !== (publicProfile.bio || '')

  const handleSaveProfile = async () => {
    const cleanUsername = usernameDraft.toLowerCase().replace(/[^a-z0-9-_]/g, '')
    await publicProfile.savePublicProfile({ username: cleanUsername, bio: bioDraft })
    setSaveMessage('Saved!')
    setTimeout(() => setSaveMessage(''), 2500)
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-bg-secondary border border-border rounded-xl p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent-primary/15 text-accent-primary'
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.mobileLabel}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && <PublicProfile isSelf />}
      {activeTab === 'taste' && <Profile hidePublicProfile hideHeader />}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Account info */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Account</h2>
            <p className="text-sm text-text-muted mb-4">Signed in as</p>
            <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
              {publicProfile.avatarEmoji ? (
                <div className="w-10 h-10 rounded-full bg-bg-primary flex items-center justify-center text-xl">
                  {publicProfile.avatarEmoji}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary text-sm font-bold">
                  {user?.displayName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user?.displayName}</p>
                <p className="text-xs text-text-muted truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Public profile settings */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe size={20} className="text-accent-primary" />
              <h2 className="text-lg font-semibold text-text-primary">Public Profile</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Your avatar</label>
                <div className="flex items-start gap-4">
                  <EmojiPicker value={publicProfile.avatarEmoji} onChange={publicProfile.setAvatarEmoji} />
                  <div className="flex-1 text-xs text-text-muted pt-3">
                    Pick an emoji to be your avatar. Or don't — we're not your parents.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-text-primary">Make profile public</p>
                  <p className="text-xs text-text-muted">Let anyone at /{publicProfile.username || 'your-username'} see your profile.</p>
                </div>
                <button
                  onClick={publicProfile.togglePublic}
                  className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ml-3 ${publicProfile.isPublic ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${publicProfile.isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Username</label>
                <div className="flex items-center bg-bg-tertiary border border-border rounded-lg focus-within:border-accent-primary transition-colors overflow-hidden">
                  <span className="px-3 text-sm text-text-muted border-r border-border select-none">/</span>
                  <input
                    type="text"
                    value={usernameDraft}
                    onChange={(e) => setUsernameDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    placeholder="leckybang"
                    maxLength={30}
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1.5">Letters, numbers, dashes. This is your URL.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Bio</label>
                <textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value.slice(0, 160))}
                  placeholder="A few words about your taste, vibe, or whatever."
                  rows={2}
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors resize-none"
                />
                <p className="text-xs text-text-muted mt-1">{bioDraft.length}/160</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-text-muted">
                  {saveMessage ? <span className="text-accent-books flex items-center gap-1"><Check size={12} />{saveMessage}</span> : publicProfile.saving ? 'Saving…' : ''}
                </span>
                <button
                  onClick={handleSaveProfile}
                  disabled={!hasProfileChanges || publicProfile.saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent-primary hover:bg-accent-hover text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  Save Profile
                </button>
              </div>
            </div>
          </div>

          {/* Email radar */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-accent-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Email me my Weekly Radar</p>
                  <p className="text-xs text-text-muted">Every Monday morning, get a personalized dispatch in your inbox.</p>
                </div>
              </div>
              <button
                onClick={publicProfile.toggleEmailRadar}
                className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ml-3 ${publicProfile.emailRadar ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${publicProfile.emailRadar ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Sign out */}
          <div className="bg-bg-secondary border border-border rounded-2xl p-6">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-accent-movies/10 text-accent-movies hover:bg-accent-movies/20 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
