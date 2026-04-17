import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music, Film, Tv, BookOpen, ArrowRight, ArrowLeft, Sparkles, ChevronRight, Check, Plus, Bookmark, Star } from 'lucide-react'
import StarRating from '../components/common/StarRating'
import CoverArt from '../components/common/CoverArt'
import { useAuth } from '../hooks/useAuth'
import { useTasteProfile } from '../hooks/useTasteProfile'
import { useCatalog } from '../hooks/useCatalog'
import ChipSelector from '../components/common/ChipSelector'
import TagInput from '../components/common/TagInput'
import { GENRE_OPTIONS, SUGGESTION_MAP, SUGGESTION_FIELD, SUGGESTION_LABEL, getSuggestionsForGenres } from '../data/onboardingSuggestions'
import { getWeeklyRadar } from '../services/mockData'
import { determineArchetype } from '../utils/archetypes'
import { getMediaColor } from '../utils/filterUtils'

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
  const { addItem } = useCatalog()
  const [step, setStep] = useState(0)
  const [addedItems, setAddedItems] = useState(new Set())
  const [ratingItem, setRatingItem] = useState(null)  // title of item being rated
  const [ratingValue, setRatingValue] = useState(0)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isMediaStep = !!current.category

  const totalMediaSteps = STEPS.filter((s) => s.category).length
  const currentMediaStep = STEPS.slice(0, step + 1).filter((s) => s.category).length

  const archetype = useMemo(() => determineArchetype(profile), [profile])

  const radar = useMemo(() => {
    return getWeeklyRadar(profile, [])
  }, [profile])

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

  const handleWantToTry = (item) => {
    addItem({
      title: item.title,
      creator: item.creator,
      type: item.type,
      genre: item.genre || '',
      status: 'want',
    })
    setAddedItems((prev) => new Set([...prev, item.title]))
  }

  const handleAlreadyTried = (item) => {
    if (ratingItem === item.title) {
      // Save with rating
      addItem({
        title: item.title,
        creator: item.creator,
        type: item.type,
        genre: item.genre || '',
        status: 'finished',
        rating: ratingValue,
      })
      setAddedItems((prev) => new Set([...prev, item.title]))
      setRatingItem(null)
      setRatingValue(0)
    } else {
      // Open rating UI
      setRatingItem(item.title)
      setRatingValue(0)
    }
  }

  const selectedGenres = current.category ? (profile[current.category]?.genres || []) : []
  const suggestions = current.category ? getSuggestionsForGenres(current.category, selectedGenres) : []
  const selectedPicks = current.category ? (profile[current.category]?.[SUGGESTION_FIELD[current.category]] || []) : []

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #110d18 0%, #1a1228 50%, #0f0d16 100%)' }}>
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
              <div className="flex justify-center gap-3 mb-8">
                {CATEGORIES.map(({ icon: Icon, color }, i) => (
                  <div
                    key={i}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
                  >
                    <Icon size={32} style={{ color }} />
                  </div>
                ))}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                Welcome to Color Commentary
              </h1>
              <p className="text-text-secondary text-lg mb-10 max-w-md mx-auto leading-relaxed">
                Let's build your media universe. Pick your genres and favorites, and we'll power your personalized radar.
              </p>
              <button
                onClick={next}
                className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-8 py-3.5 rounded-xl text-lg font-medium transition-colors"
              >
                Let's Go
                <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* ───── GENRE STEP ───── */}
          {current.substep === 'genres' && (
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${current.color} 15%, transparent)` }}
                >
                  <current.icon size={28} style={{ color: current.color }} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{current.genreTitle}</h1>
                  <p className="text-text-secondary mt-1">{current.genreSubtitle}</p>
                </div>
              </div>

              <div className="bg-bg-secondary/80 backdrop-blur border border-border rounded-2xl p-6 md:p-8">
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
                    className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
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
              <div className="flex items-center gap-4 mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${current.color} 15%, transparent)` }}
                >
                  <current.icon size={28} style={{ color: current.color }} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{current.picksTitle}</h1>
                  <p className="text-text-secondary mt-1">{current.picksSubtitle}</p>
                </div>
              </div>

              <div className="bg-bg-secondary/80 backdrop-blur border border-border rounded-2xl p-6 md:p-8 space-y-6">
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
                    className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
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
                <div className="text-6xl mb-4">{archetype.emoji}</div>
                <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
                  You're {archetype.name}
                </h1>
                <p className="text-text-secondary text-lg max-w-lg mx-auto leading-relaxed">
                  {archetype.description}
                </p>
              </div>

              {/* Taste summary */}
              <div className="flex justify-center gap-4 mb-8">
                {CATEGORIES.map(({ key: cat, icon: Icon, color }) => {
                  const count = profile[cat] ? Object.values(profile[cat]).reduce((s, a) => s + a.length, 0) : 0
                  return (
                    <div key={cat} className="text-center">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-1"
                        style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
                      >
                        <Icon size={20} style={{ color }} />
                      </div>
                      <p className="text-sm font-bold" style={{ color }}>{count}</p>
                    </div>
                  )
                })}
              </div>

              {/* Recommendations */}
              {(radar.newReleases.length > 0 || radar.discoveries.length > 0) && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-text-primary text-center mb-1">
                    Your first recommendations
                  </h2>
                  <p className="text-sm text-text-muted text-center mb-4">
                    Save what you want to check out, or rate things you've already tried.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                    {[...radar.newReleases.slice(0, 4), ...radar.discoveries.slice(0, 4)].map((item, i) => {
                      const isAdded = addedItems.has(item.title)
                      const isRating = ratingItem === item.title
                      return (
                        <div
                          key={`${item.title}-${i}`}
                          className="bg-bg-secondary/80 border border-border rounded-xl p-3 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                              <p className="text-xs text-text-muted truncate">{item.creator}</p>
                            </div>
                          </div>

                          {isAdded ? (
                            <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 border-t border-border text-xs text-accent-books">
                              <Check size={14} />
                              Added to Catalog
                            </div>
                          ) : isRating ? (
                            <div className="mt-3 pt-2 border-t border-border">
                              <p className="text-xs text-text-muted mb-2">How was it?</p>
                              <div className="flex items-center justify-between">
                                <StarRating rating={ratingValue} onChange={setRatingValue} size={22} />
                                <button
                                  onClick={() => handleAlreadyTried(item)}
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 mt-3 pt-2 border-t border-border">
                              <button
                                onClick={() => handleWantToTry(item)}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-accent-primary hover:bg-accent-primary/10 transition-colors"
                              >
                                <Bookmark size={13} />
                                Want to Try
                              </button>
                              <button
                                onClick={() => handleAlreadyTried(item)}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
                              >
                                <Check size={13} />
                                Already Tried
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={next}
                  className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-8 py-3.5 rounded-xl text-lg font-medium transition-colors"
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
