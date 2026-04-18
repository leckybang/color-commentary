/**
 * Scores a media item against a user's taste profile.
 * Higher score = more likely to match their tastes.
 *
 * Shared between the mock (demo) radar and the real-API radar so ranking is consistent.
 */
export function matchScore(item, tasteProfile) {
  if (!item || !tasteProfile) return 0

  const allCreators = [
    ...(tasteProfile.music?.artists || []),
    ...(tasteProfile.movies?.directors || []),
    ...(tasteProfile.movies?.actors || []),
    ...(tasteProfile.tv?.creators || []),
    ...(tasteProfile.books?.authors || []),
  ].map((a) => a.toLowerCase())

  const allGenres = [
    ...(tasteProfile.music?.genres || []),
    ...(tasteProfile.movies?.genres || []),
    ...(tasteProfile.tv?.genres || []),
    ...(tasteProfile.books?.genres || []),
  ].map((g) => g.toLowerCase())

  let score = 0
  const creator = (item.creator || '').toLowerCase()
  if (creator && allCreators.some((a) => creator.includes(a) || a.includes(creator))) {
    score += 10
  }

  const genre = (item.genre || '').toLowerCase()
  if (genre && allGenres.some((g) => genre.includes(g) || g.includes(genre))) {
    score += 5
  }

  score += Math.random() * 3
  return score
}

/** Extract the top N creators/artists from a taste profile, in rough priority order. */
export function topCreators(tasteProfile, limit = 5) {
  const all = [
    ...(tasteProfile?.music?.artists || []),
    ...(tasteProfile?.movies?.directors || []),
    ...(tasteProfile?.books?.authors || []),
  ]
  return Array.from(new Set(all)).slice(0, limit)
}

/** Extract the top N genres from a taste profile, deduped. */
export function topGenres(tasteProfile, limit = 5) {
  const all = [
    ...(tasteProfile?.music?.genres || []),
    ...(tasteProfile?.movies?.genres || []),
    ...(tasteProfile?.tv?.genres || []),
    ...(tasteProfile?.books?.genres || []),
  ]
  return Array.from(new Set(all.map((g) => g.toLowerCase()))).slice(0, limit)
}
