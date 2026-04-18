/**
 * Spotify search — client shim that calls our Netlify Function.
 * The function handles Client Credentials auth server-side.
 */

export async function searchSpotify(query, { signal } = {}) {
  if (!query || query.trim().length < 2) return []

  try {
    const res = await fetch(`/.netlify/functions/spotify-search?q=${encodeURIComponent(query)}`, { signal })
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Spotify search failed', err)
    return []
  }
}

export async function fetchSpotifyNewReleases({ signal } = {}) {
  try {
    const res = await fetch('/.netlify/functions/spotify-radar?mode=new-releases', { signal })
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Spotify new releases failed', err)
    return []
  }
}

export async function fetchSpotifyRecommendations(artistNames = [], { signal } = {}) {
  if (!artistNames.length) return []
  const seeds = encodeURIComponent(artistNames.slice(0, 5).join(','))
  try {
    const res = await fetch(`/.netlify/functions/spotify-radar?mode=recommendations&seeds=${seeds}`, { signal })
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Spotify recommendations failed', err)
    return []
  }
}
