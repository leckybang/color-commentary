/**
 * Celebration — the delightful moment when you mark something Finished.
 *
 * Renders a full-screen confetti burst (dependency-free canvas) plus a centered
 * "How was it?" quick-rate prompt so logging the rating is part of the joy.
 *
 * Lives at the Catalog page level (not inside a card) so it survives the card
 * unmounting when the item jumps to the Finished section.
 */

import { useEffect, useRef, useState } from 'react'
import { PartyPopper, X } from 'lucide-react'
import StarRating from './StarRating'

// getMediaColor returns CSS var() strings, which a canvas fillStyle can't
// resolve — so read the concrete computed values here instead.
const TYPE_VAR = {
  music: '--color-accent-music',
  movie: '--color-accent-movies',
  tv: '--color-accent-tv',
  book: '--color-accent-books',
}

function resolveVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function resolveAccent(type) {
  return resolveVar(TYPE_VAR[type] || '--color-accent-primary', '#c49bff')
}

// Pull theme accent colors at runtime so confetti matches the active theme.
function themeColors() {
  return [
    resolveVar('--color-accent-primary', '#c49bff'),
    resolveVar('--color-accent-music', '#d4a0ff'),
    resolveVar('--color-accent-movies', '#ff7a8a'),
    resolveVar('--color-accent-tv', '#7ab8ff'),
    resolveVar('--color-accent-books', '#7fe0a0'),
  ]
}

function runConfetti(canvas, accent) {
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const W = window.innerWidth
  const H = window.innerHeight
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.scale(dpr, dpr)

  const palette = [accent, ...themeColors()]
  const N = 130
  const particles = Array.from({ length: N }, () => {
    // Launch from the top-center area, fanning outward.
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 0.9
    const speed = 6 + Math.random() * 9
    return {
      x: W / 2 + (Math.random() - 0.5) * W * 0.5,
      y: H * 0.28 + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 7,
      color: palette[(Math.random() * palette.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }
  })

  const gravity = 0.28
  const drag = 0.992
  let frame = 0
  let raf

  const tick = () => {
    frame++
    ctx.clearRect(0, 0, W, H)
    let alive = false
    for (const p of particles) {
      p.vy += gravity
      p.vx *= drag
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      // Fade out over the back half of the animation.
      const alpha = Math.max(0, 1 - frame / 120)
      if (alpha <= 0 || p.y > H + 40) continue
      alive = true
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    if (alive && frame < 160) {
      raf = requestAnimationFrame(tick)
    } else {
      ctx.clearRect(0, 0, W, H)
    }
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

const FINISH_LINES = [
  'Another one in the books.',
  "That's a wrap.",
  'Logged for posterity.',
  'Officially in your hall of fame.',
  'One more for the collection.',
]

export default function Celebration({ item, onRate, onReview, onClose }) {
  const canvasRef = useRef(null)
  // Two-beat flow: rate → jot a thought → done. State resets per item because
  // Catalog remounts this via a key, so no manual reset is needed.
  const [rating, setRating] = useState(0)
  const [thoughts, setThoughts] = useState('')
  const [step, setStep] = useState('rate') // 'rate' | 'thoughts' | 'done'

  useEffect(() => {
    if (!item || !canvasRef.current) return
    const accent = resolveAccent(item.type)
    const stop = runConfetti(canvasRef.current, accent)
    return stop
  }, [item])

  useEffect(() => {
    if (!item) return
    const onEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [item, onClose])

  if (!item) return null

  const line = FINISH_LINES[(item.title?.length || 0) % FINISH_LINES.length]

  const handleRate = (r) => {
    if (r > 0) {
      setRating(r)
      onRate(r)          // save the rating immediately
      setStep('thoughts') // then invite a thought
    }
  }

  const handleSaveThoughts = () => {
    const t = thoughts.trim()
    if (t) onReview(t)
    setStep('done')
    setTimeout(onClose, 900)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Dim backdrop (click to dismiss) — painted first so it sits behind the confetti */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Confetti canvas — above the backdrop, behind the card, non-interactive */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ width: '100vw', height: '100vh' }}
      />
      {/* Quick-rate card */}
      <div className="relative bg-bg-secondary border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-[cc-pop_220ms_ease-out]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-text-muted hover:bg-bg-hover transition-colors"
        >
          <X size={16} />
        </button>
        <div className="flex items-center justify-center gap-1.5 text-accent-primary mb-2">
          <PartyPopper size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">Finished</span>
        </div>
        <h3
          className="text-lg font-bold text-text-primary leading-tight"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {item.title}
        </h3>
        <p className="text-sm text-text-muted mt-1">{line}</p>

        {step === 'rate' && (
          <>
            <p className="text-sm text-text-secondary mt-5 mb-2">How was it?</p>
            <div className="flex justify-center">
              <StarRating rating={0} onChange={handleRate} size={32} />
            </div>
            <button
              onClick={onClose}
              className="mt-5 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Skip for now
            </button>
          </>
        )}

        {step === 'thoughts' && (
          <>
            <div className="flex justify-center mt-4 mb-3">
              <StarRating rating={rating} readonly size={20} />
            </div>
            <p className="text-sm text-text-secondary mb-2">Any thoughts while it's fresh?</p>
            <textarea
              autoFocus
              value={thoughts}
              onChange={(e) => setThoughts(e.target.value)}
              onKeyDown={(e) => {
                // ⌘/Ctrl+Enter to save quickly
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSaveThoughts()
              }}
              placeholder="A line about what stuck with you…"
              rows={3}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors resize-none text-left"
            />
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={onClose}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSaveThoughts}
                disabled={!thoughts.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent-primary text-white hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save note
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <p className="mt-6 text-sm font-medium text-accent-books">Saved ✓</p>
        )}
      </div>
    </div>
  )
}
