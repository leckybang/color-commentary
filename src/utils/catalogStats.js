// Pure helpers for computing analytics from a catalog. Everything below
// assumes catalog items shaped { type, status, rating, dateAdded, dateConsumed }.

const TYPE_LABELS = { music: 'Music', movie: 'Movies', tv: 'TV', book: 'Books' }
const TYPE_ORDER = ['music', 'movie', 'tv', 'book']

// Use dateConsumed when the user set it, otherwise fall back to dateAdded.
// This is the "when did they finish it" timestamp for stats.
function consumedAt(item) {
  return item.dateConsumed || item.dateAdded
}

function isFinished(item) {
  return item.status === 'finished'
}

function startOfWeek(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday-start week
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

function weekLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function monthLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short' })
}

// Return last N week buckets, each { start, end, label, byType: { music, movie, tv, book }, total }
export function getFinishedByWeek(items, weeks = 8) {
  const now = new Date()
  const thisWeek = startOfWeek(now)
  const buckets = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek)
    start.setDate(thisWeek.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    buckets.push({
      start, end,
      label: weekLabel(start),
      byType: { music: 0, movie: 0, tv: 0, book: 0 },
      total: 0,
    })
  }
  for (const item of items) {
    if (!isFinished(item)) continue
    const at = consumedAt(item)
    if (!at) continue
    const t = new Date(at)
    for (const b of buckets) {
      if (t >= b.start && t < b.end) {
        if (b.byType[item.type] !== undefined) b.byType[item.type]++
        b.total++
        break
      }
    }
  }
  return buckets
}

// Same idea for months
export function getFinishedByMonth(items, months = 6) {
  const now = new Date()
  const thisMonth = startOfMonth(now)
  const buckets = []
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - i, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    buckets.push({
      start, end,
      label: monthLabel(start),
      byType: { music: 0, movie: 0, tv: 0, book: 0 },
      total: 0,
    })
  }
  for (const item of items) {
    if (!isFinished(item)) continue
    const at = consumedAt(item)
    if (!at) continue
    const t = new Date(at)
    for (const b of buckets) {
      if (t >= b.start && t < b.end) {
        if (b.byType[item.type] !== undefined) b.byType[item.type]++
        b.total++
        break
      }
    }
  }
  return buckets
}

// Total finished this week / month / year
export function getRollupCounts(items) {
  const now = new Date()
  const weekStart = startOfWeek(now)
  const monthStart = startOfMonth(now)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  let week = 0, month = 0, year = 0
  for (const item of items) {
    if (!isFinished(item)) continue
    const at = consumedAt(item)
    if (!at) continue
    const t = new Date(at)
    if (t >= yearStart) year++
    if (t >= monthStart) month++
    if (t >= weekStart) week++
  }
  return { week, month, year }
}

// Top-rated items, sorted by rating desc then recency. Caps optional per type.
export function getTopRated(items, limit = 6, minRating = 4) {
  return [...items]
    .filter((i) => (i.rating || 0) >= minRating)
    .sort((a, b) => {
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0)
      return new Date(b.dateConsumed || b.dateAdded || 0) - new Date(a.dateConsumed || a.dateAdded || 0)
    })
    .slice(0, limit)
}

// Items rated 4+ recently — caps to last 30 days by default
export function getRecentHighlyRated(items, limit = 6, days = 30, minRating = 4) {
  const cutoff = Date.now() - days * 86400000
  return [...items]
    .filter((i) => (i.rating || 0) >= minRating)
    .filter((i) => {
      const at = new Date(i.dateConsumed || i.dateAdded || 0).getTime()
      return at >= cutoff
    })
    .sort((a, b) => new Date(b.dateConsumed || b.dateAdded || 0) - new Date(a.dateConsumed || a.dateAdded || 0))
    .slice(0, limit)
}

// Counts grouped by media type — for the catalog tab badges
export function getCountsByType(items) {
  const out = { music: 0, movie: 0, tv: 0, book: 0 }
  for (const item of items) {
    if (out[item.type] !== undefined) out[item.type]++
  }
  return out
}

export { TYPE_LABELS, TYPE_ORDER }
