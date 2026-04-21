import { useState } from 'react'
import { X, Music, Film, Tv, BookOpen, Check, ChevronRight } from 'lucide-react'
import { CALIBRATION_QUESTIONS, ONBOARDING_STEPS } from '../data/calibrationData'

const STEP_ICONS = { music: Music, movies: Film, tv: Tv, books: BookOpen }
const STEP_COLORS = {
  music: 'var(--color-accent-music)',
  movies: 'var(--color-accent-movies)',
  tv: 'var(--color-accent-tv)',
  books: 'var(--color-accent-books)',
}

export default function CalibrationOnboarding({ onComplete, onDismiss }) {
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState({}) // questionId → Set of selected values

  const currentStepMeta = ONBOARDING_STEPS[step]
  const question = CALIBRATION_QUESTIONS.find((q) => q.id === currentStepMeta.questionId)
  const selected = selections[question.id] || new Set()
  const Icon = STEP_ICONS[currentStepMeta.type]
  const color = STEP_COLORS[currentStepMeta.type]
  const isLast = step === ONBOARDING_STEPS.length - 1

  const toggle = (option) => {
    setSelections((prev) => {
      const next = new Set(prev[question.id] || [])
      if (next.has(option)) next.delete(option)
      else next.add(option)
      return { ...prev, [question.id]: next }
    })
  }

  const advance = () => {
    if (isLast) {
      // Build a map of { questionId: [...selectedValues] }
      const result = {}
      for (const [qId, set] of Object.entries(selections)) {
        if (set.size > 0) result[qId] = [...set]
      }
      onComplete(result)
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
    >
      <div
        className="bg-bg-secondary border border-border rounded-2xl w-full shadow-2xl flex flex-col"
        style={{ maxWidth: '560px', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <div>
            <p className="text-xs text-text-muted font-medium tracking-wide uppercase mb-1">
              Step {step + 1} of {ONBOARDING_STEPS.length}
            </p>
            <h2 className="text-xl font-bold text-text-primary">{question.question}</h2>
          </div>
          <button
            onClick={onDismiss}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-secondary transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step progress pills */}
        <div className="flex gap-1.5 px-6 pb-4 shrink-0">
          {ONBOARDING_STEPS.map((s, i) => {
            const StepIcon = STEP_ICONS[s.type]
            const stepColor = STEP_COLORS[s.type]
            return (
              <div
                key={s.type}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={
                  i === step
                    ? { backgroundColor: `color-mix(in srgb, ${stepColor} 20%, transparent)`, color: stepColor }
                    : i < step
                    ? { backgroundColor: `color-mix(in srgb, ${stepColor} 10%, transparent)`, color: `color-mix(in srgb, ${stepColor} 60%, var(--color-text-muted))` }
                    : { color: 'var(--color-text-muted)' }
                }
              >
                {i < step ? <Check size={11} /> : <StepIcon size={11} />}
                {s.label}
              </div>
            )
          })}
        </div>

        {/* Options grid */}
        <div className="overflow-y-auto flex-1 px-6 pb-2">
          <div className="flex flex-wrap gap-2 pb-2">
            {question.options.map((opt) => {
              const isSelected = selected.has(opt)
              return (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                  style={
                    isSelected
                      ? {
                          backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                          color,
                          borderColor: `color-mix(in srgb, ${color} 50%, transparent)`,
                        }
                      : {
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)',
                          backgroundColor: 'transparent',
                        }
                  }
                >
                  {isSelected && <Check size={11} className="inline mr-1 -mt-0.5" />}
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={advance}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip this step
          </button>
          <button
            onClick={advance}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: color }}
          >
            {isLast ? 'Done' : 'Next'}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
