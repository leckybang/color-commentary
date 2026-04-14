import { NavLink } from 'react-router-dom'
import { LayoutDashboard, SlidersHorizontal, BookMarked, Library, Radar, LogOut, Users, MessageCircle, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/me', icon: User, label: 'My Profile' },
  { to: '/calibrate', icon: SlidersHorizontal, label: 'Calibrator' },
  { to: '/weekly', icon: BookMarked, label: 'Liner Notes' },
  { to: '/catalog', icon: Library, label: 'Catalog' },
  { to: '/radar', icon: Radar, label: 'Radar' },
  { to: '/friends', icon: Users, label: 'Friends' },
  { to: '/group-chat', icon: MessageCircle, label: 'Group Chat' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-bg-secondary border-r border-border h-screen sticky top-0">
        <div className="p-5 border-b border-border">
          <h1 className="text-xl font-bold bg-gradient-to-r from-accent-music via-accent-movies to-accent-tv bg-clip-text text-transparent">
            Color Commentary
          </h1>
          <p className="text-xs text-text-muted mt-1">Your media universe</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-primary/15 text-accent-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary text-sm font-bold">
              {user?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
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

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border z-40 px-2 py-1 flex justify-around">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-accent-primary' : 'text-text-muted'
              }`
            }
          >
            <Icon size={20} />
            <span>{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
