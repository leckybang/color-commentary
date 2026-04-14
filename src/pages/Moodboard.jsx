import { useState } from 'react'
import { Music, Film, Tv, BookOpen, Star, ArrowRight, Sparkles, Bookmark, MessageCircle, SlidersHorizontal, Check } from 'lucide-react'
import { THEMES } from '../config/themes'
import { useTheme } from '../hooks/useTheme'

function MiniCard({ theme, type, title, creator }) {
  const color = theme.accents[type]
  const icons = { music: Music, movie: Film, tv: Tv, book: BookOpen }
  const Icon = icons[type] || Music
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ backgroundColor: theme.bg.tertiary, border: `1px solid ${theme.border}` }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: theme.text.primary, fontFamily: theme.headingFont }}>{title}</p>
        <p className="text-xs truncate" style={{ color: theme.text.muted }}>{creator}</p>
      </div>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4].map(s => (
          <Star key={s} size={11} fill="#f59e0b" stroke="#f59e0b" />
        ))}
        <Star size={11} fill="transparent" stroke={theme.text.muted} />
      </div>
    </div>
  )
}

function ThemePreview({ theme }) {
  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ backgroundColor: theme.bg.primary, borderColor: theme.border }}
    >
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: theme.border }}>
        <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: theme.text.muted }}>
          Color Commentary
        </p>
        <h2 className="text-xl font-bold mb-1" style={{ color: theme.text.primary, fontFamily: theme.headingFont }}>
          Good evening, Becky.
        </h2>
        <p className="text-sm" style={{ color: theme.text.secondary, fontFamily: theme.bodyFont }}>
          Here's what's happening in your media universe.
        </p>
        <button
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ backgroundColor: theme.accents.primary }}
        >
          <Sparkles size={14} />
          Check Your Weekly Radar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 p-4">
        {[
          { label: 'Cataloged', value: '24' },
          { label: 'Streak', value: '3' },
          { label: 'Avg', value: '3.8' },
          { label: 'Done', value: '18' },
        ].map(s => (
          <div key={s.label} className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.bg.secondary, border: `1px solid ${theme.border}` }}>
            <p className="text-lg font-bold" style={{ color: theme.text.primary }}>{s.value}</p>
            <p className="text-xs" style={{ color: theme.text.muted }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="px-4 pb-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: theme.text.muted }}>
          This Week on Your Radar
        </p>
        <MiniCard theme={theme} type="book" title="Quantum Gardens" creator="Ted Chiang" />
        <MiniCard theme={theme} type="music" title="Velvet Reverie" creator="Beach House" />
        <MiniCard theme={theme} type="movie" title="The Last Expedition" creator="Denis Villeneuve" />
      </div>

      {/* Scratchpad */}
      <div className="px-4 pb-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: theme.bg.secondary, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={14} style={{ color: theme.accents.primary }} />
            <p className="text-xs font-medium" style={{ color: theme.text.primary, fontFamily: theme.headingFont }}>
              Someone Told Me About...
            </p>
          </div>
          <div className="p-2 rounded-lg text-xs" style={{ backgroundColor: theme.bg.tertiary, color: theme.text.secondary }}>
            My friend said Shogun is incredible
          </div>
        </div>
      </div>

      {/* Accent color swatches */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          {['music', 'movies', 'tv', 'books', 'primary'].map(key => (
            <div key={key} className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: theme.accents[key] }} />
              <span className="text-[9px]" style={{ color: theme.text.muted }}>{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Moodboard() {
  const { setTheme } = useTheme()
  const [selected, setSelected] = useState(null)

  const handleSelect = (i) => {
    setSelected(i)
    setTheme(i)
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Libre Baskerville', serif" }}>
            Pick Your Vibe
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Three visual directions for Color Commentary. Each one changes the entire feel of the app — colors, mood, energy. Pick the one that feels like you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {THEMES.map((theme, i) => (
            <div key={i} className="space-y-4">
              {/* Theme header */}
              <div className="text-center">
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  {theme.name}
                </h2>
                <p className="text-sm text-gray-400 mt-1">{theme.tagline}</p>
              </div>

              {/* Preview */}
              <ThemePreview theme={theme} />

              {/* Vibe description */}
              <p className="text-xs text-gray-500 text-center italic px-4">
                {theme.vibe}
              </p>

              {/* Select button */}
              <div className="text-center">
                <button
                  onClick={() => handleSelect(i)}
                  className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selected === i
                      ? 'text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  style={selected === i ? { backgroundColor: theme.accents.primary } : {}}
                >
                  {selected === i ? (
                    <span className="flex items-center gap-2"><Check size={16} /> Selected</span>
                  ) : (
                    'Choose This Vibe'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {selected !== null && (
          <div className="text-center mt-10 p-6 rounded-2xl" style={{ backgroundColor: '#222' }}>
            <p className="text-white text-lg font-medium" style={{ fontFamily: "'Libre Baskerville', serif" }}>
              You picked <strong>{THEMES[selected].name}</strong>
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Let me know and I'll apply it across the entire app!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
