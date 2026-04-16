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
