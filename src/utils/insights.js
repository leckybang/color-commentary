/**
 * Insights — derive the "look what you did" highlights from a catalog.
 *
 * Everything here is computed from the same item shape useCatalog returns
 * (status, rating, type, dateConsumed, dateAdded). A finished item's date is
 * its dateConsumed if present, otherwise the date it was added.
 */

const TYPE_NOUNS = {
  music: { one: 'album', many: 'albums' },
  movie: { one: 'film', many: 'films' },
  tv: { one: 'show', many: 'shows' },
  book: { one: 'book', many: 'books' },
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function finishedDate(item) {
  return new Date(item.dateConsumed || item.dateAdded || Date.now())
}

function pluralizeType(type, n) {
  const noun = TYPE_NOUNS[type]
  if (!noun) return `${n} items`
  return `${n} ${n === 1 ? noun.one : noun.many}`
}

/**
 * Build the type breakdown phrase, e.g. "5 books, 3 films & 2 albums".
 * Ordered by count desc so the biggest category leads.
 */
function breakdownPhrase(byType) {
  const parts = Object.entries(byType)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => pluralizeType(type, n))
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`
}

export function computeInsights(items = []) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const monthLabel = MONTHS[now.getMonth()]

  const finished = items.filter((i) => i.status === 'finished')
  const finishedThisMonth = finished.filter((i) => finishedDate(i) >= monthStart)
  const finishedThisYear = finished.filter((i) => finishedDate(i) >= yearStart)

  // Use this month if there's anything; otherwise fall back to all-time so the
  // hero is never empty for an established user.
  const usingMonth = finishedThisMonth.length > 0
  const scope = usingMonth ? finishedThisMonth : finished
  const periodLabel = usingMonth ? monthLabel : 'all time'

  const byType = { music: 0, movie: 0, tv: 0, book: 0 }
  scope.forEach((i) => { if (byType[i.type] !== undefined) byType[i.type]++ })

  // Faves: highest-rated within the scope, then most recent. Up to 3.
  const faves = [...scope]
    .filter((i) => i.rating > 0)
    .sort((a, b) => (b.rating - a.rating) || (finishedDate(b) - finishedDate(a)))
    .slice(0, 3)

  // Top genre across the scope.
  const genreCounts = {}
  scope.forEach((i) => {
    if (i.genre) {
      const g = i.genre.trim()
      if (g) genreCounts[g] = (genreCounts[g] || 0) + 1
    }
  })
  const topGenreEntry = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]
  const topGenre = topGenreEntry && topGenreEntry[1] >= 2 ? topGenreEntry[0] : null

  const fiveStarCount = scope.filter((i) => i.rating === 5).length

  return {
    hasData: finished.length > 0,
    usingMonth,
    periodLabel,
    monthLabel,
    count: scope.length,
    byType,
    breakdown: breakdownPhrase(byType),
    faves,
    topGenre,
    fiveStarCount,
    totalFinished: finished.length,
    finishedThisYear: finishedThisYear.length,
  }
}

/** Big headline shown in the hero. */
export function insightsHeadline(insights) {
  if (!insights.hasData) return "Your story starts here"
  const { count, usingMonth, monthLabel } = insights
  if (usingMonth) {
    return `You finished ${count} ${count === 1 ? 'thing' : 'things'} in ${monthLabel}`
  }
  return `${count} ${count === 1 ? 'thing' : 'things'} finished, all time`
}
