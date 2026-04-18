/**
 * Spotify Radar — server-side fetch of new album releases.
 * Returns normalized album objects matching the client radar item shape.
 * Env vars required: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'
import { getSpotifyToken } from './_shared/spotifyAuth.js'

function normalizeAlbum(album) {
  return {
    type: 'music',
    provider: 'spotify',
    externalId: album.id,
    title: album.name,
    creator: (album.artists || []).map((a) => a.name).join(', '),
    genre: '',
    releaseDate: album.release_date || '',
    coverUrl: album.images?.[1]?.url || album.images?.[0]?.url || '',
    spotifyUrl: album.external_urls?.spotify || '',
    description: '',
    isNewRelease: true,
  }
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || ''

  if (event.httpMethod === 'OPTIONS') return handleOptions(origin)
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const limit = Math.min(parseInt(event.queryStringParameters?.limit || '20', 10) || 20, 50)

  try {
    const token = await getSpotifyToken()
    const res = await fetch(
      `https://api.spotify.com/v1/browse/new-releases?limit=${limit}&country=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: corsHeaders(origin),
        body: JSON.stringify({ error: 'Spotify new-releases failed' }),
      }
    }

    const data = await res.json()
    const items = (data.albums?.items || []).map(normalizeAlbum)

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({ items }),
    }
  } catch (err) {
    console.error('spotify-radar error', err.message)
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'Internal error' }),
    }
  }
}
