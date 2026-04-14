import { useState, useEffect } from 'react'
import { Cookie, X } from 'lucide-react'

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

  const accept = () => {
    localStorage.setItem('cc_cookie_consent', 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 flex justify-center">
      <div className="bg-bg-secondary border border-border rounded-xl p-4 shadow-lg max-w-lg w-full flex items-center gap-3">
        <Cookie size={20} className="text-accent-primary shrink-0" />
        <p className="text-xs text-text-secondary flex-1">
          We use cookies and local storage to save your preferences and improve your experience.
        </p>
        <button
          onClick={accept}
          className="px-3 py-1.5 bg-accent-primary hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors shrink-0"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
