import { useState } from 'react'
import { Star } from 'lucide-react'

export default function StarRating({ rating = 0, onChange, size = 20, readonly = false }) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange?.(star === rating ? 0 : star)}
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <Star
            size={size}
            fill={(hover || rating) >= star ? '#f59e0b' : 'transparent'}
            stroke={(hover || rating) >= star ? '#f59e0b' : 'var(--color-text-muted)'}
          />
        </button>
      ))}
    </div>
  )
}
