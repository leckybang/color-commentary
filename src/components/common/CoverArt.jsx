import { useState } from 'react'
import { Music, Film, Tv, BookOpen } from 'lucide-react'
import { getMediaColor } from '../../utils/filterUtils'

const TYPE_ICONS = { music: Music, movie: Film, tv: Tv, book: BookOpen }

// Generate a deterministic color palette from a string
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return hash
}

function getGradient(title, type) {
  const hash = Math.abs(hashString(title))
  const baseHues = { music: 270, movie: 0, tv: 210, book: 140 }
  const baseHue = baseHues[type] || 270
  const hue1 = (baseHue + (hash % 40) - 20 + 360) % 360
  const hue2 = (hue1 + 30 + (hash % 30)) % 360
  return `linear-gradient(135deg, hsl(${hue1}, 50%, 25%) 0%, hsl(${hue2}, 60%, 15%) 100%)`
}

function getPattern(title) {
  const hash = Math.abs(hashString(title))
  const patterns = [
    // Diagonal lines
    'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 9px)',
    // Dots
    'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
    // Horizontal lines
    'repeating-linear-gradient(0deg, transparent, transparent 12px, rgba(255,255,255,0.03) 12px, rgba(255,255,255,0.03) 13px)',
    // Cross-hatch
    'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.02) 6px, rgba(255,255,255,0.02) 7px), repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(255,255,255,0.02) 6px, rgba(255,255,255,0.02) 7px)',
    // Clean (no pattern)
    'none',
  ]
  return patterns[hash % patterns.length]
}

export default function CoverArt({ title, type, creator, coverUrl, size = 'md', className = '' }) {
  const [imgFailed, setImgFailed] = useState(false)
  const Icon = TYPE_ICONS[type] || Music
  const color = getMediaColor(type)
  const gradient = getGradient(title || '', type)
  const pattern = getPattern(title || '')

  const sizes = {
    sm: { wrapper: 'w-12 h-12 rounded-lg', icon: 14, text: false },
    md: { wrapper: 'w-20 h-24 rounded-xl', icon: 20, text: true },
    lg: { wrapper: 'w-28 h-36 rounded-xl', icon: 24, text: true },
    radar: { wrapper: 'w-16 h-20 rounded-lg', icon: 16, text: true },
  }
  const s = sizes[size] || sizes.md

  // If we have a real cover URL from the media API, render it. Fall back to
  // the synthetic gradient if the image fails to load (broken link, blocked).
  if (coverUrl && !imgFailed) {
    return (
      <div className={`${s.wrapper} ${className} relative overflow-hidden shrink-0 bg-bg-tertiary`}>
        <img
          src={coverUrl}
          alt={title || ''}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 rounded-[inherit] border pointer-events-none"
          style={{ borderColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
        />
      </div>
    )
  }

  return (
    <div
      className={`${s.wrapper} ${className} relative overflow-hidden shrink-0 flex flex-col items-center justify-center`}
      style={{ background: gradient }}
    >
      {/* Pattern overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: pattern, backgroundSize: '20px 20px' }}
      />
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-1">
        <Icon size={s.icon} style={{ color, opacity: 0.7 }} />
        {s.text && (
          <p
            className="text-[8px] font-medium mt-1 leading-tight opacity-70 line-clamp-2 px-1"
            style={{ color, fontFamily: "'Libre Baskerville', serif" }}
          >
            {title}
          </p>
        )}
      </div>
      {/* Subtle border */}
      <div
        className="absolute inset-0 rounded-[inherit] border"
        style={{ borderColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
      />
    </div>
  )
}
