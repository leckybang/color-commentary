import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music, Film, Tv, BookOpen, ArrowRight, ArrowLeft, Sparkles, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTasteProfile } from '../hooks/useTasteProfile'
import ChipSelector from '../components/common/ChipSelector'
import TagInput from '../components/common/TagInput'
import { GENRE_OPTIONS, SUGGESTION_MAP, SUGGESTION_FIELD, SUGGESTION_LABEL, getSuggestionsForGenres } from '../data/onboardingSuggestions'
import { determineArchetype } from '../utils/archetypes'

const CATEGORIES = [
  {
    key: 'music',
    icon: Music,
    color: 'var(--color-accent-music)',
    genreTitle: "What sounds like you?",
    genreSubtitle: 'Pick the genres that define your music taste.',
    picksTitle: "Who's always on repeat?",
    picksSubtitle: 'Based on your genres — tap to add, or type your own below.',
  },
  {
    key: 'movies',
    icon: Film,
    color: 'var(--color-accent-movies)',
    genreTitle: 'What do you reach for on movie night?',
    genreSubtitle: 'Pick the genres you keep coming back to.',
    picksTitle: 'Who are you always rewatching?',
    picksSubtitle: 'Directors we think you might love — tap to add.',
  },
  {
    key: 'tv',
    icon: Tv,
    color: 'var(--color-accent-tv)',
    genreTitle: 'What owns your evenings?',
    genreSubtitle: 'Pick the kinds of shows you gravitate toward.',
    picksTitle: 'Which shows have your heart?',
    picksSubtitle: 'Based on your genres — tap the ones you love.',
  },
  {
    key: 'books',
    icon: BookOpen,
    color: 'var(--color-accent-books)',
    genreTitle: 'What lives on your nightstand?',
    genreSubtitle: 'Pick the genres you reach for most.',
    picksTitle: 'Who are your must-read authors?',
    picksSubtitle: 'We think you might love these — tap to add.',
  },
]

// Build flat step array: welcome, then genre+picks for each category, then done
const STEPS = [
  { key: 'welcome' },
  ...CATEGORIES.flatMap((cat) => [
    { key: `${cat.key}-genres`, category: cat.key, substep: 'genres', ...cat },
    { key: `${cat.key}-picks`, category: cat.key, substep: 'picks', ...cat },
  ]),
  { key: 'done' },
]

const TYPE_ICONS = { music: Music, movie: Film, tv: Tv, book: BookOpen }
const TYPE_LABELS = { music: 'Music', movie: 'Movie', tv: 'TV', book: 'Book' }

export default function Onboarding() {
  const navigate = useNavigate()
  const { updateProfile } = useAuth()
  const { profile, addTag, removeTag } = useTasteProfile()
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isMediaStep = !!current.category

  const totalMediaSteps = STEPS.filter((s) => s.category).length
  const currentMediaStep = STEPS.slice(0, step + 1).filter((s) => s.category).length

  const archetype = useMemo(() => determineArchetype(profile), [profile])


  const next = () => {
    if (isLast) {
      updateProfile({ onboardingComplete: true })
      navigate('/')
    } else {
      setStep(step + 1)
    }
  }

  const back = () => {
    if (step > 0) setStep(step - 1)
  }

  const skip = () => {
    updateProfile({ onboardingComplete: true })
    navigate('/')
  }

  const toggleGenre = (genre) => {
    const genres = profile[current.category]?.genres || []
    if (genres.includes(genre)) {
      removeTag(current.category, 'genres', genre)
    } else {
      addTag(current.category, 'genres', genre)
    }
  }

  const togglePick = (value) => {
    const field = SUGGESTION_FIELD[current.category]
    const picks = profile[current.category]?.[field] || []
    if (picks.includes(value)) {
      removeTag(current.category, field, value)
    } else {
      addTag(current.category, field, value)
    }
  }

  const selectedGenres = current.category ? (profile[current.category]?.genres || []) : []
  const suggestions = current.category ? getSuggestionsForGenres(current.category, selectedGenres) : []
  const selectedPicks = current.category ? (profile[current.category]?.[SUGGESTION_FIELD[current.category]] || []) : []

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary">
      {/* Progress bar */}
      {isMediaStep && (
        <div className="fixed top-0 left-0 right-0 z-10">
          <div className="h-1 bg-bg-tertiary">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${(currentMediaStep / totalMediaSteps) * 100}%`,
                background: `linear-gradient(90deg, var(--color-accent-music), var(--color-accent-movies), var(--color-accent-tv), var(--color-accent-books))`,
              }}
            />
          </div>
        </div>
      )}

      {/* Skip button */}
      {!isLast && (
        <div className="fixed top-4 right-4 z-10">
          <button
            onClick={skip}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors px-3 py-1.5 rounded-lg hover:bg-bg-hover/50"
          >
            Skip for now
          </button>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl">

          {/* ───── WELCOME ───── */}
          {current.key === 'welcome' && (
            <div className="text-center">
              <p className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[3px] text-text-muted mb-5">
                <span className="w-5 h-[3px] rounded-full bg-accent-primary inline-block" aria-hidden="true" />
                welcome to
                <span className="w-5 h-[3px] rounded-full bg-accent-primary inline-block" aria-hidden="true" />
              </p>
              <div className="flex items-center justify-center gap-3.5 mb-8">
                <div className="grid grid-cols-2 gap-1 w-11 h-11 shrink-0" aria-hidden="true">
                  <span className="rounded-[10px_10px_10px_3px] bg-accent-music" />
                  <span className="rounded-[10px_10px_10px_3px] bg-accent-movies" />
                  <span className="rounded-[10px_10px_10px_3px] bg-accent-tv" />
                  <span className="rounded-[10px_10px_10px_3px] bg-accent-books" />
                </div>
                <span
                  className="text-[34px] font-extrabold leading-[0.95] text-left text-text-primary"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-1px' }}
                >
                  color
                  <br />
                  <span className="relative inline-block">
                    commentary
                    <span className="absolute left-0 right-0 -bottom-1 h-[4px] rounded-full bg-accent-primary" aria-hidden="true" />
                  </span>
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-4 tracking-tight">
                First, let's tune your taste.
              </h1>
              <p className="text-text-secondary text-lg mb-8 max-w-md mx-auto leading-relaxed">
                Four quick rounds — music, movies, TV, books. Tap what you love and your Radar takes shape around it.
              </p>
              <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto mb-10">
                {CATEGORIES.map((c, i) => {
                  const { color } = c
                  const Icon = c.icon
                  return (
                    <div
                      key={i}
                      className="ink-tile relative overflow-hidden rounded-2xl h-16 flex items-center justify-center"
                      style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, var(--color-bg-secondary))` }}
                    >
                      <span className="absolute top-0 right-0 w-5 h-5 rounded-bl-xl" style={{ backgroundColor: color }} aria-hidden="true" />
                      <Icon size={26} style={{ color }} />
                    </div>
                  )
                })}
              </div>
              <button
                onClick={next}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-lg font-bold transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)', boxShadow: '4px 4px 0 var(--color-accent-primary)' }}
              >
                Let's Go
                <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* ───── GENRE STEP ───── */}
          {current.substep === 'genres' && (
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[3px] text-text-muted mb-3">
                <span className="w-5 h-[3px] rounded-full inline-block" style={{ backgroundColor: current.color }} aria-hidden="true" />
                step {currentMediaStep} of {totalMediaSteps}
              </p>
              <div className="flex items-center gap-4 mb-8">
                <div
                  className="ink-tile relative overflow-hidden w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${current.color} 16%, var(--color-bg-secondary))` }}
                >
                  <span className="absolute top-0 right-0 w-4 h-4 rounded-bl-xl" style={{ backgroundColor: current.color }} aria-hidden="true" />
                  <current.icon size={26} style={{ color: current.color }} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">{current.genreTitle}</h1>
                  <p className="text-text-secondary mt-1">{current.genreSubtitle}</p>
                </div>
              </div>

              <div className="ink-card bg-bg-secondary rounded-2xl p-6 md:p-8">
                <ChipSelector
                  key={`${current.category}-genres`}
                  options={GENRE_OPTIONS[current.category]}
                  selected={selectedGenres}
                  onToggle={toggleGenre}
                  color={current.color}
                />
              </div>

              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={back}
                  className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors px-4 py-2 rounded-lg hover:bg-bg-hover/50"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <div className="flex items-center gap-2">
                  {selectedGenres.length > 0 && (
                    <span className="text-sm text-text-muted">{selectedGenres.length} selected</span>
                  )}
                  <button
                    onClick={next}
                    className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-6 py-2.5 rounded-full font-bold transition-colors"
                  >
                    Next
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───── PICKS STEP ───── */}
          {current.substep === 'picks' && (
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[3px] text-text-muted mb-3">
                <span className="w-5 h-[3px] rounded-full inline-block" style={{ backgroundColor: current.color }} aria-hidden="true" />
                step {currentMediaStep} of {totalMediaSteps}
              </p>
              <div className="flex items-center gap-4 mb-8">
                <div
                  className="ink-tile relative overflow-hidden w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${current.color} 16%, var(--color-bg-secondary))` }}
                >
                  <span className="absolute top-0 right-0 w-4 h-4 rounded-bl-xl" style={{ backgroundColor: current.color }} aria-hidden="true" />
                  <current.icon size={26} style={{ color: current.color }} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">{current.picksTitle}</h1>
                  <p className="text-text-secondary mt-1">{current.picksSubtitle}</p>
                </div>
              </div>

              <div className="ink-card bg-bg-secondary rounded-2xl p-6 md:p-8 space-y-6">
                {suggestions.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-3">
                      {SUGGESTION_LABEL[current.category]}
                    </label>
                    <ChipSelector
                      key={`${current.category}-picks`}
                      options={suggestions}
                      selected={selectedPicks}
                      onToggle={togglePick}
                      color={current.color}
                    />
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-text-muted text-sm">Go back and pick some genres for personalized suggestions, or add your own below.</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">
                    Add others not listed
                  </label>
                  <TagInput
                    key={`${current.category}-freetext`}
                    tags={selectedPicks}
                    onAdd={(val) => addTag(current.category, SUGGESTION_FIELD[current.category], val)}
                    onRemove={(val) => removeTag(current.category, SUGGESTION_FIELD[current.category], val)}
                    placeholder={`Type a name and press Enter...`}
                    color={current.color}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={back}
                  className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors px-4 py-2 rounded-lg hover:bg-bg-hover/50"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <div className="flex items-center gap-2">
                  {selectedPicks.length > 0 && (
                    <span className="text-sm text-text-muted">{selectedPicks.length} added</span>
                  )}
                  <button
                    onClick={next}
                    className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-6 py-2.5 rounded-full font-bold transition-colors"
                  >
                    {step === STEPS.length - 2 ? 'See My Results' : 'Next'}
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───── DONE ───── */}
          {current.key === 'done' && (
            <div>
              {/* Archetype reveal */}
              <div className="text-center mb-10">
                <p className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[3px] text-text-muted mb-5">
                  <span className="w-5 h-[3px] rounded-full bg-accent-primary inline-block" aria-hidden="true" />
                  the results are in
                  <span className="w-5 h-[3px] rounded-full bg-accent-primary inline-block" aria-hidden="true" />
                </p>
                <div className="text-6xl mb-4">{archetype.emoji}</div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-2 tracking-tight">
                  You're <span className="text-accent-primary">{archetype.name}</span>
                </h1>
                <p className="text-text-secondary text-lg max-w-lg mx-auto leading-relaxed">
                  {archetype.description}
                </p>
              </div>

              {/* Taste summary */}
              <div className="flex justify-center gap-4 mb-8">
                {CATEGORIES.map((c) => {
                  const { key: cat, color } = c
                  const Icon = c.icon
                  const count = profile[cat] ? Object.values(profile[cat]).reduce((s, a) => s + a.length, 0) : 0
                  return (
                    <div
                      key={cat}
                      className="ink-tile relative overflow-hidden rounded-2xl px-4 py-3 text-center"
                      style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, var(--color-bg-secondary))` }}
                    >
                      <span className="absolute top-0 right-0 w-4 h-4 rounded-bl-xl" style={{ backgroundColor: color }} aria-hidden="true" />
                      <Icon size={18} style={{ color }} className="mx-auto mb-1" />
                      <p
                        className="text-2xl font-extrabold text-text-primary leading-none"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {count}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* What you get next — generic, no fake titles */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-text-primary text-center mb-1">
                  What you'll get on your Radar
                </h2>
                <p className="text-sm text-text-muted text-center mb-5">
                  A weekly dispatch from the parts of culture worth your attention.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { title: 'Hyped', body: 'Popular new releases this month that critics also love.', color: 'var(--color-accent-primary)' },
                    { title: "Critics' Darlings", body: 'Quietly raved picks from NYT Books, Pitchfork, and top critics.', color: 'var(--color-accent-books)' },
                  ].map((b) => (
                    <div
                      key={b.title}
                      className="ink-tile rounded-xl p-4 text-left"
                      style={{ backgroundColor: `color-mix(in srgb, ${b.color} 12%, var(--color-bg-secondary))` }}
                    >
                      <div className="h-1 w-10 rounded-full mb-2" style={{ backgroundColor: b.color }} />
                      <p className="text-sm font-semibold text-text-primary mb-1">{b.title}</p>
                      <p className="text-xs text-text-muted leading-relaxed">{b.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={next}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-lg font-bold transition-all hover:opacity-90 active:scale-[0.99]"
                  style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)', boxShadow: '4px 4px 0 var(--color-accent-primary)' }}
                >
                  Enter Your Universe
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
