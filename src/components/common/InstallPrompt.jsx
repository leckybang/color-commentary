/**
 * InstallPrompt — a gentle, dismissible nudge to add the app to the home screen.
 *
 * The #1 reason people lose a new web app is re-entry: they sign up in a browser
 * tab, close it, and can't remember the name or URL later. A home-screen icon
 * fixes that. This shows a slim banner that:
 *   - never appears once the app is already installed (standalone display mode),
 *   - uses the native install flow on Android/Chromium (captured
 *     `beforeinstallprompt`), with a one-tap Install button,
 *   - falls back to short text instructions on iOS Safari and other mobile
 *     browsers that don't expose a programmatic prompt,
 *   - stays hidden on desktop browsers that can't install (nothing to nudge),
 *   - remembers a dismissal so it never nags.
 */

import { useEffect, useState } from 'react'
import { Smartphone, Download, Share, X } from 'lucide-react'

const DISMISS_KEY = 'cc_install_dismissed'

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari
  )
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    // Chromium fires this when the app meets installability criteria. Capturing
    // it lets us trigger the native sheet from our own button later.
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* private mode: a session-only dismiss is fine */
    }
  }

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try {
      await deferredPrompt.userChoice
    } catch {
      /* ignore */
    }
    setDeferredPrompt(null)
    dismiss()
  }

  if (installed || dismissed) return null

  const ua = navigator.userAgent || ''
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  const isAndroid = /android/i.test(ua)
  const canPrompt = !!deferredPrompt

  // Desktop browsers with no native prompt have no home screen to add to, so
  // there's nothing useful to say. Only speak up where it helps.
  if (!canPrompt && !isIOS && !isAndroid) return null

  let body
  if (canPrompt) {
    body = 'Keep it one tap away on your home screen.'
  } else if (isIOS) {
    body = 'Tap Share, then Add to Home Screen.'
  } else {
    body = 'Open your browser menu, then Add to Home Screen.'
  }

  return (
    <div className="fixed inset-x-0 bottom-24 md:bottom-6 z-40 flex justify-center px-4 pointer-events-none">
      <div className="ink-card pointer-events-auto flex items-center gap-3 bg-bg-secondary rounded-2xl pl-4 pr-2 py-2.5 max-w-sm">
        <Smartphone size={18} className="text-accent-primary shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Add Color Commentary
          </p>
          <p className="text-xs text-text-secondary leading-snug">{body}</p>
        </div>
        {canPrompt ? (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shrink-0"
            style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)', boxShadow: '2px 2px 0 var(--color-accent-primary)' }}
          >
            <Download size={12} />
            Install
          </button>
        ) : isIOS ? (
          <Share size={16} className="text-text-muted shrink-0" aria-hidden="true" />
        ) : null}
        <button
          onClick={dismiss}
          className="p-1.5 rounded-full text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors shrink-0"
          title="Not now"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
