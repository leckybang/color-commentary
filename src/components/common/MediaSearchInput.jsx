import { useState, useRef, useEffect } from 'react'
import { X, Plus, Music, Film, Tv, BookOpen, Loader2, Search } from 'lucide-react'
import { useMediaSearch } from '../../hooks/useMediaSearch'
import { getMediaColor } from '../../utils/filterUtils'

const TYPE_ICONS = { music: Music, movie: Film, tv: Tv, book: BookOpen }
const TYPE_LABELS = { music: 'Music', movie: 'Movie', tv: 'TV', book: 'Book' }

// Normalize a tag (legacy string or new object) to a consistent object shape
function normalizeTag(tag) {
  if (typeof tag === 'string') return { kind: 'text', title: tag }
  return tag
}

function tagKey(tag) {
  const n = normalizeTag(tag)
  if (n.provider && n.externalId) return `${n.provider}:${n.externalId}`
  return `text:${n.title.toLowerCase()}`
}

export default function MediaSearchInput({
  tags = [],
  onAdd,
  onRemove,
  placeholder = 'Search...',
  color = 'var(--color-accent-primary)',
  preferredTypes,
}) {
  const [query, setQuery] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const { results, loading } = useMediaSearch(query, preferredTypes)

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIdx(0)
  }, [results])

  const existingKeys = new Set(tags.map(tagKey))
  const filteredResults = results.filter(r => !existingKeys.has(tagKey(r)))

  const handleSelect = (result) => {
    onAdd(result)
    setQuery('')
    setShowDropdown(false)
  }

  const handleAddPlainText = () => {
    const value = query.trim()
    if (!value) return
    const newTag = { kind: 'text', title: value }
    if (!existingKeys.has(tagKey(newTag))) {
      onAdd(newTag)
    }
    setQuery('')
    setShowDropdown(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showDropdown && filteredResults.length > 0 && filteredResults[highlightIdx]) {
        handleSelect(filteredResults[highlightIdx])
      } else {
        handleAddPlainText()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setShowDropdown(true)
      setHighlightIdx(i => Math.min(i + 1, filteredResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    } else if (e.key === 'Backspace' && !query && tags.length > 0) {
      onRemove(tags[tags.length - 1])
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Tag chips */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag, i) => {
            const n = normalizeTag(tag)
            const Icon = n.type ? TYPE_ICONS[n.type] : null
            const tagColor = n.type ? getMediaColor(n.type) : color
            return (
              <span
                key={tagKey(tag) + '-' + i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: `color-mix(in srgb, ${tagColor} 20%, transparent)`, color: tagColor }}
              >
                {n.coverUrl ? (
                  <img src={n.coverUrl} alt="" className="w-5 h-5 rounded object-cover" loading="lazy" referrerPolicy="no-referrer" />
                ) : Icon ? (
                  <Icon size={12} />
                ) : null}
                <span className="max-w-[200px] truncate">
                  {n.title}
                  {n.year && <span className="opacity-60 ml-1">({n.year})</span>}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(tag)}
                  className="hover:opacity-70 transition-opacity"
                  style={{ background: 'none', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Input + dropdown */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true) }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowDropdown(true)}
              placeholder={placeholder}
              className="w-full bg-bg-tertiary border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
            />
            {loading && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted animate-spin" />
            )}
          </div>
          <button
            type="button"
            onClick={handleAddPlainText}
            disabled={!query.trim()}
            className="p-2 bg-bg-tertiary border border-border rounded-lg hover:bg-bg-hover transition-colors text-text-secondary disabled:opacity-30"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Dropdown */}
        {showDropdown && query.trim().length >= 2 && (filteredResults.length > 0 || (!loading && query.trim().length >= 2)) && (
          <div className="absolute top-full mt-1 left-0 right-12 bg-bg-secondary border border-border rounded-lg shadow-xl z-30 max-h-80 overflow-y-auto">
            {filteredResults.length > 0 ? (
              filteredResults.map((result, i) => {
                const Icon = TYPE_ICONS[result.type] || Music
                const itemColor = getMediaColor(result.type)
                const isHighlighted = i === highlightIdx
                return (
                  <button
                    key={tagKey(result)}
                    type="button"
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setHighlightIdx(i)}
                    className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${isHighlighted ? 'bg-bg-hover' : 'hover:bg-bg-hover'}`}
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
                      <div className="w-10 h-12 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${itemColor} 15%, transparent)` }}>
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
                      style={{ backgroundColor: `color-mix(in srgb, ${itemColor} 15%, transparent)`, color: itemColor }}
                    >
                      {TYPE_LABELS[result.type]}
                    </span>
                  </button>
                )
              })
            ) : (
              !loading && (
                <div className="p-3 text-xs text-text-muted text-center">
                  No matches. Press Enter to add "{query.trim()}" as a tag.
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
