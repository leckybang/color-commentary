/**
 * Shared Spotify Client Credentials token helper for Netlify Functions.
 * Module-scope cache survives warm invocations.
 */

let tokenCache = { access_token: null, expires_at: 0 }

export async function getSpotifyToken({ forceRefresh = false } = {}) {
  const now = Date.now()
  if (!forceRefresh && tokenCache.access_token && tokenCache.expires_at > now + 60000) {
    return tokenCache.access_token
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured')
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`)
  const data = await res.json()
  tokenCache = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in || 3600) * 1000,
  }
  return tokenCache.access_token
}

/** Force the next getSpotifyToken() call to refetch from Spotify. */
export function invalidateSpotifyToken() {
  tokenCache = { access_token: null, expires_at: 0 }
}
