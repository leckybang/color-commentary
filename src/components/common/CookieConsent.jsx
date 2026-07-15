import { useState, useEffect } from 'react'
import { Cookie } from 'lucide-react'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cc_cookie_consent')
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const setConsent = (choice) => {
    localStorage.setItem('cc_cookie_consent', choice)
    // Update Google Analytics consent state (Consent Mode v2).
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: choice === 'accepted' ? 'granted' : 'denied',
      })
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div className="bg-bg-secondary border border-border rounded-xl p-4 shadow-lg max-w-lg w-full flex flex-col sm:flex-row sm:items-center gap-3 pointer-events-auto">
        <Cookie size={20} className="text-accent-primary shrink-0" />
        <p className="text-xs text-text-secondary flex-1">
          We use essential cookies to keep you signed in, plus optional analytics cookies to understand how the app is used. You can decline the optional ones.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setConsent('declined')}
            className="px-3 py-1.5 bg-bg-tertiary hover:bg-bg-hover text-text-secondary text-xs font-medium rounded-lg transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => setConsent('accepted')}
            className="px-3 py-1.5 bg-accent-primary hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
