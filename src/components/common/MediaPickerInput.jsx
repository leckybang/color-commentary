import { useState, useRef, useEffect } from 'react'
import { Music, Film, Tv, BookOpen, Loader2, Search, X } from 'lucide-react'
import { useMediaSearch } from '../../hooks/useMediaSearch'
import { getMediaColor } from '../../utils/filterUtils'

const TYPE_ICONS = { music: Music, movie: Film, tv: Tv, book: BookOpen }
const TYPE_LABELS = { music: 'Music', movie: 'Movie', tv: 'TV', book: 'Book' }

/**
 * Single-pick search input. Similar to MediaSearchInput but instead of
 * accumulating tags, picking a result (or pressing Enter on free text)
 * calls onPick(result) once.
 *
 * Used in the Catalog Add modal to let users search a specific API
 * (based on selected type) and auto-fill title/creator/year/cover.
 */
export default function MediaPickerInput({
  value = '',
  onChange,
  onPick,
  placeholder = 'Search...',
  preferredTypes,
  autoFocus = false,
}) {
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [hasPicked, setHasPicked] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Only search when user is actively typing (not after a pick)
  const { results, loading } = useMediaSearch(hasPicked ? '' : value, preferredTypes)

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus()
  }, [autoFocus])

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    setHighlightIdx(0)
  }, [results])

  const handleChange = (e) => {
    setHasPicked(false)
    onChange(e.target.value)
    setShowDropdown(true)
  }

  const handleSelect = (result) => {
    setHasPicked(true)
    setShowDropdown(false)
    onPick(result)
  }

  const handleFreeText = () => {
    const v = value.trim()
    if (!v) return
    setShowDropdown(false)
    onPick({ kind: 'text', title: v })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showDropdown && results.length > 0 && results[highlightIdx]) {
        handleSelect(results[highlightIdx])
      } else {
        handleFreeText()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setShowDropdown(true)
      setHighlightIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const handleClear = () => {
    setHasPicked(false)
    setShowDropdown(true)
    onChange('')
    if (inputRef.current) inputRef.current.focus()
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => !hasPicked && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full bg-bg-tertiary border border-border rounded-lg pl-9 pr-9 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
        />
        {loading && !hasPicked && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted animate-spin" />
        )}
        {value && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && !hasPicked && value.trim().length >= 2 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-bg-secondary border border-border rounded-lg shadow-xl z-30 max-h-72 overflow-y-auto">
          {results.length > 0 ? (
            results.map((result, i) => {
              const Icon = TYPE_ICONS[result.type] || Music
              const itemColor = getMediaColor(result.type)
              const isHighlighted = i === highlightIdx
              return (
                <button
                  key={`${result.provider}-${result.externalId}`}
                  type="button"
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setHighlightIdx(i)}
                  className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${
                    isHighlighted ? 'bg-bg-hover' : 'hover:bg-bg-hover'
                  }`}
                >
                  {result.coverUrl ? (
                    <img
                      src={result.coverUrl}
                      alt=""
                      className="w-10 h-12 rounded object-cover shrink-0 bg-bg-tertiary"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="w-10 h-12 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `color-mix(in srgb, ${itemColor} 15%, transparent)` }}
                    >
                      <Icon size={16} style={{ color: itemColor }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{result.title}</p>
                    <p className="text-xs text-text-muted truncate">
                      {result.creator}
                      {result.creator && result.year && ' · '}
                      {result.year}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${itemColor} 15%, transparent)`,
                      color: itemColor,
                    }}
                  >
                    {TYPE_LABELS[result.type]}
                  </span>
                </button>
              )
            })
          ) : (
            !loading && (
              <div className="p-3 text-xs text-text-muted text-center">
                No matches. Press Enter to use "{value.trim()}" as-is.
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
