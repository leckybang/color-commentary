import { useState, useEffect } from 'react'
import { SlidersHorizontal, Check, ArrowRight, RotateCcw } from 'lucide-react'
import { getCalibrationRound } from '../data/calibrationData'

const ACCENT_BY_CATEGORY = {
  music: 'var(--color-accent-music)',
  movies: 'var(--color-accent-movies)',
  tv: 'var(--color-accent-tv)',
  books: 'var(--color-accent-books)',
}

const ICON_BY_CATEGORY = {
  music: '♪',
  movies: '★',
  tv: '▶',
  books: '✦',
}

function todayKey(uid) {
  const d = new Date()
  return `cc_calibration_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}_${uid}`
}

function seenKey(uid) {
  return `cc_calibration_seen_${uid}`
}

function readSeen(uid) {
  try {
    const raw = localStorage.getItem(seenKey(uid))
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function writeSeen(uid, set) {
  try {
    localStorage.setItem(seenKey(uid), JSON.stringify([...set]))
  } catch {
    // Quota / private-browsing — silently skip
  }
}

export default function CalibrationWidget({ user, profile, addTag }) {
  const uid = user?.uid || 'anon'
  const [dismissedToday, setDismissedToday] = useState(
    () => !!localStorage.getItem(todayKey(uid))
  )
  const [picksToday, setPicksToday] = useState(0)
  const [seen, setSeen] = useState(() => readSeen(uid))
  const [recentQs, setRecentQs] = useState([])
  const [round, setRound] = useState(null)
  const [justPicked, setJustPicked] = useState(null) // { value, color } briefly shown

  // Generate the first round once the profile is hydrated
  useEffect(() => {
    if (!round && !dismissedToday) {
      const next = getCalibrationRound(profile, seen, recentQs)
      setRound(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissedToday])

  if (dismissedToday || !round) {
    if (dismissedToday && picksToday > 0) {
      return (
        <div className="bg-bg-secondary border border-border rounded-2xl p-4 flex items-center gap-3">
          <Check size={16} className="text-accent-books" />
          <p className="text-sm text-text-secondary">
            Nice! {picksToday} {picksToday === 1 ? 'pick' : 'picks'} added to your taste profile today.
          </p>
        </div>
      )
    }
    return null
  }

  const { question, options } = round
  const color = ACCENT_BY_CATEGORY[question.category] || 'var(--color-accent-primary)'

  const nextRound = (nextSeen, nextRecent) => {
    setRound(getCalibrationRound(profile, nextSeen, nextRecent))
  }

  const handlePick = (option) => {
    addTag(question.category, question.field, option)
    setPicksToday((n) => n + 1)
    // Mark the picked option AND the other two as seen — we don't want to re-show this round's set
    const nextSeen = new Set(seen)
    for (const opt of options) nextSeen.add(opt)
    setSeen(nextSeen)
    writeSeen(uid, nextSeen)
    const nextRecent = [...recentQs, question.id]
    setRecentQs(nextRecent)
    setJustPicked({ value: option, color })
    // Brief flash, then next round
    setTimeout(() => {
      setJustPicked(null)
      nextRound(nextSeen, nextRecent)
    }, 350)
  }

  const handleSkipRound = () => {
    // Treat as "none of these three" — mark seen so they don't reappear
    const nextSeen = new Set(seen)
    for (const opt of options) nextSeen.add(opt)
    setSeen(nextSeen)
    writeSeen(uid, nextSeen)
    const nextRecent = [...recentQs, question.id]
    setRecentQs(nextRecent)
    nextRound(nextSeen, nextRecent)
  }

  const handleDoneForToday = () => {
    localStorage.setItem(todayKey(uid), '1')
    setDismissedToday(true)
  }

  const handleResetSeen = () => {
    setSeen(new Set())
    writeSeen(uid, new Set())
    setRecentQs([])
    setRound(getCalibrationRound(profile, new Set(), []))
  }

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} style={{ color }} />
          <span className="text-xs font-medium tracking-wide uppercase" style={{ color }}>
            Taste Check
          </span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted">{question.subtitle}</span>
        </div>
        {picksToday > 0 && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
          >
            {picksToday} {picksToday === 1 ? 'pick' : 'picks'} today
          </span>
        )}
      </div>
      <p className="text-base font-semibold text-text-primary mb-1">{question.short || question.question}</p>
      <p className="text-xs text-text-muted mb-4">
        Tap your favorite. We'll keep going so your taste profile gets sharper with each one.
      </p>

      {justPicked ? (
        <div
          className="flex items-center gap-2 py-3 px-4 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: `color-mix(in srgb, ${justPicked.color} 15%, transparent)`,
            color: justPicked.color,
          }}
        >
          <Check size={16} />
          <span>"{justPicked.value}" added.</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => handlePick(opt)}
                className="group relative px-4 py-3 rounded-xl border text-sm font-medium text-text-secondary hover:text-text-primary transition-all text-left"
                style={{ borderColor: 'var(--color-border)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `color-mix(in srgb, ${color} 60%, transparent)`
                  e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${color} 10%, transparent)`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <span className="text-xs mr-2 opacity-70" style={{ color }}>{ICON_BY_CATEGORY[question.category]}</span>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkipRound}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
              >
                None of these <ArrowRight size={12} />
              </button>
              <button
                onClick={handleDoneForToday}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                I'm good for today
              </button>
            </div>
            {seen.size > 30 && (
              <button
                onClick={handleResetSeen}
                className="text-[11px] text-text-muted/70 hover:text-text-muted transition-colors flex items-center gap-1"
                title="Bring back options you've already seen"
              >
                <RotateCcw size={10} />
                Reset seen ({seen.size})
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
