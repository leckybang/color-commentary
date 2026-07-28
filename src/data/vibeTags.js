/**
 * Vibe tags — why something landed, beyond whether it was any good.
 *
 * A star rating measures craft. These measure the other reasons people
 * actually consume things: it was a beach read, you inhaled it in one sitting,
 * it's the thing you rewatch when you're sick. Deliberately a fixed
 * vocabulary, not free text, so they aggregate into something meaningful
 * across a catalog (and across users, later).
 *
 * The stored value is the `id`. Renaming an id orphans existing data, so add
 * new tags rather than rewriting old ones.
 */

export const VIBE_GROUPS = [
  {
    key: 'loved',
    label: 'What worked',
    hint: 'The reasons it landed.',
    color: 'var(--color-status-finished)',
  },
  {
    key: 'missed',
    label: "What didn't",
    hint: 'No judgment. Useful data.',
    color: 'var(--color-text-muted)',
  },
]

export const VIBE_TAGS = [
  { id: 'beachy', label: '#Beachy', group: 'loved', hint: 'Zero homework required.' },
  { id: 'binged', label: '#Binged', group: 'loved', hint: 'Gone in one sitting.' },
  { id: 'thinky', label: '#Thinky', group: 'loved', hint: 'Still chewing on it.' },
  { id: 'comfort-food', label: '#ComfortFood', group: 'loved', hint: 'The one you return to.' },
  { id: 'good-weird', label: '#GoodWeird', group: 'loved', hint: 'Strange, and better for it.' },
  { id: 'try-hard', label: '#TryHard', group: 'missed', hint: 'You can see it reaching.' },
  { id: 'not-my-thing', label: '#NotMyThing', group: 'missed', hint: 'Fine. Just not for you.' },
  { id: 'didnt-get-it', label: '#DidntGetIt', group: 'missed', hint: 'Everyone else seemed to.' },
  { id: 'just-meh', label: '#JustMeh', group: 'missed', hint: 'It happened, and then it was over.' },
]

/** Cap per item — enough to be expressive, few enough to still mean something. */
export const MAX_VIBE_TAGS = 4

const BY_ID = new Map(VIBE_TAGS.map((t) => [t.id, t]))

export function getVibeTag(id) {
  return BY_ID.get(id) || null
}

export function vibeTagsIn(group) {
  return VIBE_TAGS.filter((t) => t.group === group)
}

/**
 * Coerce anything (a DB array, a stale localStorage blob, undefined) into a
 * clean list of known tag ids. Unknown ids are dropped rather than kept, so a
 * removed tag can't linger in the UI as an unlabelled chip.
 */
export function sanitizeVibeTags(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const out = []
  for (const raw of value) {
    const id = typeof raw === 'string' ? raw.trim() : ''
    if (!id || seen.has(id) || !BY_ID.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= MAX_VIBE_TAGS) break
  }
  return out
}

export function toggleVibeTag(tags, id) {
  const current = sanitizeVibeTags(tags)
  if (current.includes(id)) return current.filter((t) => t !== id)
  if (current.length >= MAX_VIBE_TAGS) return current
  return [...current, id]
}

/**
 * Count tag usage across a catalog, most-used first. Powers the "your top
 * vibes" readout.
 */
export function topVibeTags(items = [], limit = 3) {
  const counts = new Map()
  for (const item of items) {
    for (const id of sanitizeVibeTags(item.vibeTags)) {
      counts.set(id, (counts.get(id) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ tag: getVibeTag(id), count }))
    .filter((t) => t.tag)
}
