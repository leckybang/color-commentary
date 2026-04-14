import { useState } from 'react'
import { X, Plus } from 'lucide-react'

export default function TagInput({ tags = [], onAdd, onRemove, placeholder = 'Add...', color = 'var(--color-accent-primary)' }) {
  const [value, setValue] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      onAdd(value.trim())
      setValue('')
    }
    if (e.key === 'Backspace' && !value && tags.length > 0) {
      onRemove(tags[tags.length - 1])
    }
  }

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`, color }}
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemove(tag)}
              className="hover:opacity-70 transition-opacity"
              style={{ background: 'none', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="p-2 bg-bg-tertiary border border-border rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
