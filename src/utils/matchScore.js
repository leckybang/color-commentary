/**
 * Score a radar item against a user's taste profile. Higher = better match.
 *
 * Safe for partial items (missing creator/genre — common in real API data):
 * we fall back to a small random component so unscored items still surface
 * rather than clumping at the bottom.
 */

export function matchScore(item, tasteProfile = {}) {
  let score = 0

  const creatorList = [
    ...(tasteProfile.music?.artists || []),
    ...(tasteProfile.movies?.directors || []),
    ...(tasteProfile.movies?.actors || []),
    ...(tasteProfile.tv?.creators || []),
    ...(tasteProfile.books?.authors || []),
  ].map((a) => String(a).toLowerCase())

  const genreList = [
    ...(tasteProfile.music?.genres || []),
    ...(tasteProfile.movies?.genres || []),
    ...(tasteProfile.tv?.genres || []),
    ...(tasteProfile.books?.genres || []),
  ].map((g) => String(g).toLowerCase())

  const creator = (item.creator || '').toLowerCase()
  const genre = (item.genre || '').toLowerCase()

  if (creator && creatorList.some((a) => creator.includes(a))) score += 10
  if (genre && genreList.some((g) => genre.includes(g))) score += 5

  score += Math.random() * 3

  return score
}
