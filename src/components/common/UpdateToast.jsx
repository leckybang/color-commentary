/**
 * UpdateToast — nudges long-lived sessions onto the newest deploy.
 *
 * Home-screen web apps (especially on iOS) can keep running a days-old
 * bundle: the OS resumes the old page instead of refetching. This watches
 * for new deploys by comparing the hashed bundle filename in a fresh copy
 * of index.html against the one this page loaded with, and offers a
 * one-tap refresh when they differ.
 *
 * In local dev there is no hashed bundle, so the whole thing no-ops.
 */

import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

const CHECK_EVERY_MS = 10 * 60 * 1000 // at most one check per 10 minutes

function currentBundleSrc() {
  return document.querySelector('script[src^="/assets/index-"]')?.getAttribute('src') || null
}

export function extractBundleSrc(html) {
  return html.match(/\/assets\/index-[\w.-]+\.js/)?.[0] || null
}

export default function UpdateToast() {
  const [updateReady, setUpdateReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const runningSrc = currentBundleSrc()
    if (!runningSrc) return // dev server or unexpected markup: do nothing

    let lastCheck = 0
    let cancelled = false

    const check = async () => {
      const now = Date.now()
      if (document.hidden || now - lastCheck < CHECK_EVERY_MS) return
      lastCheck = now
      try {
        const res = await fetch('/', { cache: 'no-store' })
        if (!res.ok) return
        const latest = extractBundleSrc(await res.text())
        if (!cancelled && latest && latest !== runningSrc) setUpdateReady(true)
      } catch {
        /* offline or flaky network: try again next time */
      }
    }

    // The moments a stale session comes back to life.
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      cancelled = true
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  if (!updateReady || dismissed) return null

  return (
    <div className="fixed inset-x-0 bottom-24 md:bottom-6 z-40 flex justify-center px-4 pointer-events-none">
      <div className="ink-card pointer-events-auto flex items-center gap-3 bg-bg-secondary rounded-full pl-4 pr-2 py-2">
        <p className="text-sm font-medium text-text-primary">A new version is ready.</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
          style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)', boxShadow: '2px 2px 0 var(--color-accent-primary)' }}
        >
          <RefreshCw size={12} />
          Refresh
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-full text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
          title="Not now"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
