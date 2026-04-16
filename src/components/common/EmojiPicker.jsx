import { useState } from 'react'
import { Smile } from 'lucide-react'

// A curated, vibes-forward emoji set
const EMOJI_CATEGORIES = {
  'Vibes': ['✨', '🌙', '🌸', '🍒', '🫧', '🎀', '🧃', '🌻', '🫶', '🪩', '🍋', '🌈', '🦋', '🌊', '🔮'],
  'Creatures': ['🐈', '🐈‍⬛', '🐕', '🦊', '🦝', '🦦', '🦄', '🐙', '🦩', '🐝', '🐞', '🦜', '🐸', '🦔'],
  'Food & Drink': ['☕', '🍵', '🍷', '🍸', '🧋', '🍿', '🍩', '🥐', '🍓', '🌮', '🍜', '🍣', '🍑', '🧁'],
  'Objects': ['📚', '📖', '🎬', '🎧', '🎸', '🎹', '🎨', '📷', '🖋️', '💎', '🎭', '🎪', '🎤', '📺'],
  'Feelings': ['😎', '🥰', '🤩', '😌', '😇', '🫠', '🙃', '🫡', '🤭', '👁️', '🧠', '❤️', '💀', '🖤'],
  'Nature': ['🌿', '🍄', '🌷', '🌺', '🌹', '🌵', '🌳', '🍀', '🐚', '⭐', '🌟', '☀️', '⚡', '🔥'],
}

export default function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('Vibes')

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-20 h-20 rounded-full bg-bg-tertiary border-2 border-border hover:border-accent-primary flex items-center justify-center text-4xl transition-colors"
        title="Pick an avatar emoji"
      >
        {value || <Smile size={24} className="text-text-muted" />}
      </button>

      {open && (
        <div className="mt-3 bg-bg-secondary border border-border rounded-xl p-3 max-w-md">
          {/* Category tabs */}
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
            {Object.keys(EMOJI_CATEGORIES).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  category === cat
                    ? 'bg-accent-primary/15 text-accent-primary'
                    : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="grid grid-cols-7 gap-1">
            {EMOJI_CATEGORIES[category].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onChange(emoji); setOpen(false) }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl transition-colors ${
                  value === emoji ? 'bg-accent-primary/20' : 'hover:bg-bg-hover'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="w-full mt-2 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Remove emoji
            </button>
          )}
        </div>
      )}
    </div>
  )
}
