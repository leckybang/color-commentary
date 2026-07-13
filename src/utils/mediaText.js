/**
 * Text helpers for provider-supplied media descriptions.
 */

/**
 * Google Books descriptions often open with a wall of accolades ("Named a
 * Most Anticipated Read of 2026 by The New Yorker • NYT • GQ • …") glued
 * straight onto the actual synopsis with no punctuation. Split them so the
 * UI can render the praise quietly and the synopsis readably.
 *
 * Only fires when the text clearly has a bullet-separated accolade run
 * (2+ "•"); otherwise returns the text untouched as `body`.
 */
export function splitAccolades(text) {
  const t = (text || '').trim()
  if (!t) return { accolades: '', body: '' }
  const bulletCount = (t.match(/•/g) || []).length
  if (bulletCount < 2) return { accolades: '', body: t }

  const lastBullet = t.lastIndexOf('•')
  const tail = t.slice(lastBullet + 1)

  // After the final bullet comes one publication name (a run of capitalized
  // words plus connectives), then the synopsis begins at the next capitalized
  // word. Backtracking on the run finds the boundary: "…Los Angeles Times
  // |The award-winning author…".
  const m = tail.match(
    /^\s*(?:(?:[A-Z][\w'’.&:-]*|of|the|and|for|&|\d+)(?:\s+(?:[A-Z][\w'’.&:-]*|of|the|and|for|&|\d+))*)\s+(?=[A-Z])/
  )
  if (!m) return { accolades: '', body: t }

  const cut = lastBullet + 1 + m[0].length
  const accolades = t.slice(0, cut).trim()
  const body = t.slice(cut).trim()
  // If the "synopsis" ended up tiny, the split guessed wrong — don't use it.
  if (body.length < 40) return { accolades: '', body: t }
  return { accolades, body }
}
