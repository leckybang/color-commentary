import { useState } from 'react'

export default function SpectrumSlider({ leftLabel, rightLabel, value = 50, onChange, color = 'var(--color-accent-primary)' }) {
  const [isDragging, setIsDragging] = useState(false)

  const leftEmoji = getEmoji(leftLabel)
  const rightEmoji = getEmoji(rightLabel)

  // Descriptive text based on position
  const getDescription = () => {
    if (value <= 15) return `Firmly ${leftLabel.toLowerCase()}`
    if (value <= 35) return `Leaning ${leftLabel.toLowerCase()}`
    if (value <= 65) return 'Somewhere in between'
    if (value <= 85) return `Leaning ${rightLabel.toLowerCase()}`
    return `Firmly ${rightLabel.toLowerCase()}`
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
          <span>{leftEmoji}</span>
          {leftLabel}
        </span>
        <span className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
          {rightLabel}
          <span>{rightEmoji}</span>
        </span>
      </div>

      <div className="relative">
        {/* Track */}
        <div className="h-2 bg-bg-tertiary rounded-full relative overflow-hidden">
          {/* Fill gradient */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
            style={{
              width: `${value}%`,
              background: `linear-gradient(90deg, color-mix(in srgb, ${color} 40%, transparent), ${color})`,
              opacity: 0.6,
            }}
          />
        </div>

        {/* Input range (invisible, overlays for interaction) */}
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: '24px', top: '-8px' }}
        />

        {/* Thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 shadow-md transition-transform pointer-events-none"
          style={{
            left: `calc(${value}% - 8px)`,
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: color,
            transform: `translateY(-50%) scale(${isDragging ? 1.2 : 1})`,
          }}
        />
      </div>

      <p className="text-xs text-text-muted text-center italic">{getDescription()}</p>
    </div>
  )
}

function getEmoji(label) {
  const map = {
    'Mainstream': '📻',
    'Obscure': '🔍',
    'Comfort': '🛋️',
    'Challenge': '🧗',
    'Critic': '🧐',
    'Vibes': '✨',
    'Solo': '🎧',
    'Social': '🎉',
    'Neo-Goth': '🖤',
    'Period Piece Maximalist': '👑',
    'Binge It All': '⏩',
    'Savor One Episode': '🍷',
    'Make Me Cry': '😭',
    'Make Me Laugh': '😂',
    'Plot-Driven': '📐',
    'Pure Vibes': '🌊',
    'Cerebral': '🧠',
    'Visceral': '💥',
    'Nostalgic': '📼',
    'Futurist': '🚀',
    'Lo-Fi & Intimate': '🕯️',
    'Epic & Sweeping': '🏔️',
    'Inner Critic': '🧐',
    'Inner Fan': '😍',
    'Solitary Consumer': '🎧',
    'Group Watch Party': '🍿',
    'Chaotic Queue': '🎲',
    'Curated Queue': '📋',
    'Dark & Unsettling': '🌑',
    'Warm & Cozy': '☕',
    'Vinyl & Paperbacks': '📖',
    'Streaming Everything': '📱',
  }
  return map[label] || '·'
}
