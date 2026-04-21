import { useState } from 'react'
import { Sparkles, Check } from 'lucide-react'
import { getDailyQuestion, getDailyOptions } from '../data/calibrationData'

const ACCENT_BY_CATEGORY = {
  music: 'var(--color-accent-music)',
  movies: 'var(--color-accent-movies)',
  tv: 'var(--color-accent-tv)',
  books: 'var(--color-accent-books)',
}

function todayKey(uid) {
  const d = new Date()
  return `cc_calibration_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}_${uid}`
}

export default function CalibrationWidget({ user, addTag }) {
  const uid = user?.uid || 'anon'
  const [done, setDone] = useState(() => !!localStorage.getItem(todayKey(uid)))
  const [selected, setSelected] = useState(new Set())
  const [saved, setSaved] = useState(false)

  if (done) return null

  const question = getDailyQuestion()
  const options = getDailyOptions(question)
  const color = ACCENT_BY_CATEGORY[question.category] || 'var(--color-accent-primary)'

  const toggle = (opt) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(opt)) next.delete(opt)
      else next.add(opt)
      return next
    })
  }

  const handleSave = () => {
    for (const val of selected) {
      addTag(question.category, question.field, val)
    }
    setSaved(true)
    localStorage.setItem(todayKey(uid), '1')
    setTimeout(() => setDone(true), 1200)
  }

  const handleSkip = () => {
    localStorage.setItem(todayKey(uid), '1')
    setDone(true)
  }

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} style={{ color }} />
        <span className="text-xs font-medium tracking-wide uppercase" style={{ color }}>
          Taste Check
        </span>
      </div>
      <p className="text-sm font-semibold text-text-primary mb-4">{question.question}</p>

      {saved ? (
        <div className="flex items-center gap-2 py-3 text-sm font-medium" style={{ color }}>
          <Check size={16} />
          Added to your taste profile!
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {options.map((opt) => {
              const isSelected = selected.has(opt)
              return (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className="px-3 py-1.5 rounded-full text-sm border transition-all"
                  style={
                    isSelected
                      ? {
                          backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                          color,
                          borderColor: `color-mix(in srgb, ${color} 50%, transparent)`,
                          fontWeight: 500,
                        }
                      : {
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)',
                          backgroundColor: 'transparent',
                        }
                  }
                >
                  {opt}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={selected.size === 0}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-30"
              style={{ backgroundColor: color }}
            >
              Add to my profile
            </button>
            <button
              onClick={handleSkip}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Not today
            </button>
          </div>
        </>
      )}
    </div>
  )
}
