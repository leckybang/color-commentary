import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Library, Radar, LogOut, User, Plus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePublicProfile } from '../../hooks/usePublicProfile'

// People is hidden for now — the /people route still works if linked directly.
const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/radar', icon: Radar, label: 'Radar' },
  { to: '/catalog', icon: Library, label: 'Catalog' },
  { to: '/me', icon: User, label: 'Profile' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { avatarEmoji } = usePublicProfile()

  const renderMobileLink = (nav) => {
    const { to, label, mobile } = nav
    const Icon = nav.icon
    return (
      <NavLink
        key={to}
        to={to}
        className="flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors"
        style={({ isActive }) => ({
          color: isActive ? 'var(--color-nav-active)' : 'color-mix(in srgb, var(--color-nav-text) 65%, transparent)',
        })}
      >
        <Icon size={18} />
        <span>{mobile || label}</span>
      </NavLink>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-bg-secondary border-r border-border h-screen sticky top-0">
        <div className="p-5 border-b border-border">
          {/* Wordmark: palette dot-grid + stacked lowercase, pink underline */}
          <div className="flex items-center gap-2.5">
            <div className="grid grid-cols-2 gap-[3px] w-[26px] h-[26px] shrink-0" aria-hidden="true">
              <span className="rounded-[6px_6px_6px_2px] bg-accent-music" />
              <span className="rounded-[6px_6px_6px_2px] bg-accent-movies" />
              <span className="rounded-[6px_6px_6px_2px] bg-accent-tv" />
              <span className="rounded-[6px_6px_6px_2px] bg-accent-books" />
            </div>
            <h1
              className="text-[19px] font-extrabold leading-[0.95] tracking-tight text-text-primary"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-0.5px' }}
            >
              color
              <br />
              <span className="relative inline-block">
                commentary
                <span className="absolute left-0 right-0 -bottom-0.5 h-[3px] rounded-full bg-accent-primary" aria-hidden="true" />
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-text-muted mt-2.5">your media universe, annotated.</p>
        </div>

        <nav className="flex-1 p-3 space-y-1.5">
          {NAV_ITEMS.map((nav) => {
            const { to, label } = nav
            const Icon = nav.icon
            return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive ? '' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: 'var(--color-nav-bg)',
                      color: 'var(--color-nav-text)',
                      boxShadow: '3px 3px 0 var(--color-accent-primary)',
                    }
                  : undefined
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            {avatarEmoji ? (
              <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-lg">
                {avatarEmoji}
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary text-sm font-bold">
                {user?.displayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user?.displayName}</p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-muted hover:text-accent-movies rounded-lg hover:bg-bg-hover transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav — floating ink pill with a raised quick-add button */}
      <nav
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-full px-4 py-1.5 flex items-center justify-around shadow-2xl"
        style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)' }}
      >
        {NAV_ITEMS.slice(0, 2).map((nav) => renderMobileLink(nav))}
        <NavLink
          to="/catalog?add=1"
          aria-label="Add to catalog"
          className="flex items-center justify-center w-12 h-12 rounded-full -translate-y-4 shadow-lg active:scale-95 transition-transform ring-4"
          style={{
            backgroundColor: 'var(--color-nav-active)',
            color: 'var(--color-nav-bg)',
            '--tw-ring-color': 'var(--color-bg-primary)',
          }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </NavLink>
        {NAV_ITEMS.slice(2).map((nav) => renderMobileLink(nav))}
      </nav>
    </>
  )
}
