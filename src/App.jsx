import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Weekly from './pages/Weekly'
import Catalog from './pages/Catalog'
import Radar from './pages/Radar'
import Moodboard from './pages/Moodboard'
import Friends from './pages/Friends'
import Together from './pages/Together'
import PublicProfile from './pages/PublicProfile'
import CookieConsent from './components/common/CookieConsent'

function ProtectedRoute({ children }) {
  const { user, loading, needsOnboarding } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" />
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" />
  }
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  // Wait for auth to fully resolve (important for OAuth redirects)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  // If there's a hash with access_token, auth is still processing — wait
  if (window.location.hash.includes('access_token')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return user ? <Navigate to="/" /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/me" element={<PublicProfile isSelf />} />
        <Route path="/calibrate" element={<Profile />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/weekly" element={<Weekly />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/radar" element={<Radar />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/group-chat" element={<Together />} />
      </Route>
      <Route path="/u/:username" element={<PublicProfile />} />
      <Route path="/moodboard" element={<Moodboard />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
          <CookieConsent />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
