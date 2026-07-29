import { useState } from 'react'
import { Star } from 'lucide-react'
import { RATING_MAX, RATING_STEP, fillFor, formatRating, normalizeRating } from '../../utils/ratingUtils'

const GOLD = '#f59e0b'
const POSITIONS = Array.from({ length: RATING_MAX }, (_, i) => i + 1)

/**
 * One star, filled 0% / 50% / 100%. The half is drawn by clipping a filled
 * star over an outlined one rather than by a half-star glyph, so it lines up
 * exactly with its neighbours at any size.
 */
function StarGlyph({ fill, size }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <Star
        size={size}
        fill="transparent"
        stroke={fill > 0 ? GOLD : 'var(--color-text-muted)'}
        className="absolute inset-0"
      />
      {fill > 0 && (
        <span
          className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none"
          style={{ width: `${fill * 100}%` }}
        >
          <Star size={size} fill={GOLD} stroke={GOLD} />
        </span>
      )}
    </span>
  )
}

/**
 * StarRating — 0 to 5 in half-star steps.
 *
 * Interactive mode overlays two hit targets per star (left half = x.5, right
 * half = x.0) so half ratings are reachable by tap as well as by mouse.
 * Clicking the value that's already set clears the rating back to 0, which is
 * the only way to un-rate something.
 */
export default function StarRating({ rating = 0, onChange, size = 20, readonly = false }) {
  const [hover, setHover] = useState(0)

  const value = normalizeRating(readonly ? rating : hover || rating)

  if (readonly) {
    return (
      <div className="flex gap-1" role="img" aria-label={`${formatRating(rating) || 0} out of ${RATING_MAX} stars`}>
        {POSITIONS.map((star) => (
          <StarGlyph key={star} fill={fillFor(value, star)} size={size} />
        ))}
      </div>
    )
  }

  const pick = (next) => {
    // Tapping the current value clears it — otherwise there's no way back to
    // unrated once you've rated something.
    onChange?.(next === normalizeRating(rating) ? 0 : next)
  }

  return (
    <div
      className="flex gap-1"
      role="group"
      aria-label="Rating"
      onMouseLeave={() => setHover(0)}
    >
      {POSITIONS.map((star) => {
        const halfValue = star - RATING_STEP
        return (
          <span
            key={star}
            className="relative inline-block transition-transform hover:scale-110"
            style={{ width: size, height: size }}
          >
            <StarGlyph fill={fillFor(value, star)} size={size} />
            {/* Two invisible hit targets stacked over the glyph. */}
            {[halfValue, star].map((v, i) => (
              <button
                key={v}
                type="button"
                aria-label={`${formatRating(v)} stars`}
                onMouseEnter={() => setHover(v)}
                onClick={() => pick(v)}
                className="absolute inset-y-0 cursor-pointer"
                style={{
                  left: i === 0 ? 0 : '50%',
                  width: '50%',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              />
            ))}
          </span>
        )
      })}
    </div>
  )
}
