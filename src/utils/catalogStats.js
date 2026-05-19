// Pure helpers for catalog analytics. Items are shaped
// { type, status, rating, dateAdded, dateConsumed }.
//
// IMPORTANT: items can be 'want' | 'watching' | 'finished' | 'dropped'.
// Quick Add drops things in as 'watching' (in progress), so analytics that
// only count 'finished' would show zero for an active user. Everything here
// tracks ADDED (by dateAdded) and FINISHED (status === 'finished') separately.

const TYPE_LABELS = { music: 'Music', movie: 'Movies', tv: 'TV', book: 'Books' }
const TYPE_ORDER = ['book', 'tv', 'movie', 'music']

function addedAt(item) {
  return item.dateAdded ? new Date(item.dateAdded).getTime() : 0
}

// When did it get finished? Prefer an explicit consumed date, else fall back
// to dateAdded. Only meaningful when status === 'finished'.
function finishedAt(item) {
  if (item.status !== 'finished') return null
  const d = item.dateConsumed || item.dateAdded
  return d ? new Date(d).getTime() : null
}

function startOfWeek(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday-start
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfMonth(d) {
  const date = new Date(d)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

function periodStart(period, now = new Date()) {
  if (period === 'week') return startOfWeek(now).getTime()
  if (period === 'year') return new Date(now.getFullYear(), 0, 1).getTime()
  return startOfMonth(now).getTime() // default: month
}

function weekLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function monthLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short' })
}

/**
 * Headline rollup — how much was ADDED this week / month / year, plus how
 * much was finished. Added is the honest "activity" number.
 */
export function getActivityRollup(items, now = new Date()) {
  const wk = periodStart('week', now)
  const mo = periodStart('month', now)
  const yr = periodStart('year', now)
  const out = {
    week: { added: 0, finished: 0 },
    month: { added: 0, finished: 0 },
    year: { added: 0, finished: 0 },
  }
  for (const item of items) {
    const a = addedAt(item)
    const f = finishedAt(item)
    if (a >= yr) out.year.added++
    if (a >= mo) out.month.added++
    if (a >= wk) out.week.added++
    if (f != null) {
      if (f >= yr) out.year.finished++
      if (f >= mo) out.month.finished++
      if (f >= wk) out.week.finished++
    }
  }
  return out
}

/**
 * Per-type breakdown for a given period: how many added, finished, and
 * currently in progress. Powers the narrative copy.
 */
export function getActivityByType(items, period = 'month', now = new Date()) {
  const start = periodStart(period, now)
  const base = () => ({ added: 0, finished: 0, inProgress: 0 })
  const by = { music: base(), movie: base(), tv: base(), book: base() }
  const totals = base()
  for (const item of items) {
    const b = by[item.type]
    if (!b) continue
    if (addedAt(item) >= start) { b.added++; totals.added++ }
    const f = finishedAt(item)
    if (f != null && f >= start) { b.finished++; totals.finished++ }
    if (item.status === 'watching') { b.inProgress++; totals.inProgress++ }
  }
  return { by, totals }
}

// Verb-flavored narrative lines per type, only for types with activity.
const VERBS = {
  book: { plural: 'books', read: 'read', add: 'added', prog: 'reading' },
  tv: { plural: 'shows', read: 'finished', add: 'started', prog: 'watching' },
  movie: { plural: 'movies', read: 'watched', add: 'queued up', prog: 'watching' },
  music: { plural: 'albums', read: 'sat with', add: 'added', prog: 'in rotation' },
}

function pl(n, word) {
  return `${n} ${word.replace(/s$/, '')}${n === 1 ? '' : 's'}`
}

const PERIOD_WORD = { week: 'this week', month: 'this month', year: 'this year' }

/**
 * Build 1–4 fun narrative sentences from per-type activity.
 * e.g. "You've read 12 books this month." / "Started 15 shows, finished 4."
 */
export function buildNarrative(items, period = 'month', now = new Date()) {
  const { by, totals } = getActivityByType(items, period, now)
  const pw = PERIOD_WORD[period] || 'this month'
  const lines = []

  for (const type of TYPE_ORDER) {
    const v = VERBS[type]
    const { added, finished, inProgress } = by[type]
    if (added === 0 && finished === 0 && inProgress === 0) continue

    if (type === 'tv') {
      if (added > 0 && finished > 0) {
        lines.push(`You've started ${pl(added, 'shows')} ${pw}${finished < added ? `, but only finished ${finished}` : `, and finished ${finished}`}.`)
      } else if (added > 0) {
        lines.push(`You've started ${pl(added, 'shows')} ${pw}.`)
      } else if (finished > 0) {
        lines.push(`You finished ${pl(finished, 'shows')} ${pw}.`)
      } else if (inProgress > 0) {
        lines.push(`You've got ${pl(inProgress, 'shows')} on the go.`)
      }
    } else if (finished > 0) {
      const extra = added > finished ? ` — plus ${added - finished} more added` : ''
      lines.push(`You've ${v.read} ${pl(finished, v.plural)} ${pw}${extra}.`)
    } else if (added > 0) {
      lines.push(`You've ${v.add} ${pl(added, v.plural)} ${pw}.`)
    } else if (inProgress > 0) {
      lines.push(`${pl(inProgress, v.plural)} ${v.prog} right now.`)
    }
  }

  if (lines.length === 0) {
    lines.push(`Nothing logged ${pw} yet — Quick Add something to get the numbers rolling.`)
  }
  return { lines, totals }
}

/**
 * Buckets of items ADDED over time (not finished — added, so an active user
 * actually sees bars). Each bucket: { label, byType, total }.
 */
export function getAddedByBucket(items, granularity = 'week', count, now = new Date()) {
  const n = count ?? (granularity === 'week' ? 8 : 6)
  const buckets = []
  if (granularity === 'week') {
    const thisWeek = startOfWeek(now)
    for (let i = n - 1; i >= 0; i--) {
      const start = new Date(thisWeek)
      start.setDate(thisWeek.getDate() - i * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 7)
      buckets.push({ start, end, label: weekLabel(start), byType: { music: 0, movie: 0, tv: 0, book: 0 }, total: 0 })
    }
  } else {
    const thisMonth = startOfMonth(now)
    for (let i = n - 1; i >= 0; i--) {
      const start = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - i, 1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
      buckets.push({ start, end, label: monthLabel(start), byType: { music: 0, movie: 0, tv: 0, book: 0 }, total: 0 })
    }
  }
  for (const item of items) {
    const a = item.dateAdded ? new Date(item.dateAdded) : null
    if (!a) continue
    for (const b of buckets) {
      if (a >= b.start && a < b.end) {
        if (b.byType[item.type] !== undefined) b.byType[item.type]++
        b.total++
        break
      }
    }
  }
  return buckets
}

// Top-rated items (rating desc, then recency).
export function getTopRated(items, limit = 6, minRating = 4) {
  return [...items]
    .filter((i) => (i.rating || 0) >= minRating)
    .sort((a, b) => {
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0)
      return new Date(b.dateConsumed || b.dateAdded || 0) - new Date(a.dateConsumed || a.dateAdded || 0)
    })
    .slice(0, limit)
}

// Items rated 4+ within the last `days`.
export function getRecentHighlyRated(items, limit = 6, days = 30, minRating = 4) {
  const cutoff = Date.now() - days * 86400000
  return [...items]
    .filter((i) => (i.rating || 0) >= minRating)
    .filter((i) => new Date(i.dateConsumed || i.dateAdded || 0).getTime() >= cutoff)
    .sort((a, b) => new Date(b.dateConsumed || b.dateAdded || 0) - new Date(a.dateConsumed || a.dateAdded || 0))
    .slice(0, limit)
}

export function getCountsByType(items) {
  const out = { music: 0, movie: 0, tv: 0, book: 0 }
  for (const item of items) {
    if (out[item.type] !== undefined) out[item.type]++
  }
  return out
}

export { TYPE_LABELS, TYPE_ORDER }
