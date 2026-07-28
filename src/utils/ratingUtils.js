/**
 * Ratings run 0–5 in half-star steps.
 *
 * Everything that stores, displays, or compares a rating goes through here so
 * the half-step rules live in exactly one place. The database column is
 * numeric(2,1) with a check constraint that mirrors `normalizeRating`.
 */

export const RATING_MAX = 5
export const RATING_STEP = 0.5

/** Clamp to 0–5 and snap to the nearest half. Junk becomes 0. */
export function normalizeRating(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  const snapped = Math.round(n / RATING_STEP) * RATING_STEP
  return Math.min(RATING_MAX, Math.max(0, snapped))
}

/**
 * How much of star `position` (1-indexed) is filled: 0, 0.5, or 1.
 */
export function fillFor(rating, position) {
  const diff = normalizeRating(rating) - (position - 1)
  if (diff >= 1) return 1
  if (diff >= RATING_STEP) return 0.5
  return 0
}

/**
 * Display form: "4" stays "4", "4.5" stays "4.5". Never "4.0".
 */
export function formatRating(rating) {
  const n = normalizeRating(rating)
  if (n === 0) return ''
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/**
 * Star glyphs for places that can only render text (the SVG share cards).
 * A half lands as "½" because no half-star glyph renders reliably across the
 * fonts a downloaded PNG might be rasterized with.
 */
export function starString(rating) {
  const n = normalizeRating(rating)
  if (n === 0) return ''
  const full = Math.floor(n)
  const half = n - full >= RATING_STEP
  const empty = RATING_MAX - full - (half ? 1 : 0)
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, empty))
}

/**
 * The "this was a knockout" threshold. Used to be `rating === 5`; with half
 * steps a 4.5 is unmistakably a rave too, so the top band is 4.5 and up.
 */
export const RAVE_THRESHOLD = 4.5

export function isRave(rating) {
  return normalizeRating(rating) >= RAVE_THRESHOLD
}
