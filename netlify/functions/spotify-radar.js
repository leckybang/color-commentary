/**
 * Spotify Radar — server-side fetch of new album releases.
 *
 * Note: we can't use `/browse/new-releases` because Spotify deprecated that
 * endpoint for apps created after Nov 27, 2024. Instead we hit `/search`
 * with `tag:new`, which is Spotify's documented search tag for albums
 * released in the last ~2 weeks and works with the Client Credentials flow.
 *
 * We previously used `year:<current>` but that filter requires combining
 * with at least one non-filter search term to return results — on its own
 * it yields an empty album list.
 *
 * Env vars required: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'
import { getSpotifyToken, invalidateSpotifyToken } from './_shared/spotifyAuth.js'

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
  const searchUrl =
    `https://api.spotify.com/v1/search` +
    `?q=${encodeURIComponent('tag:new')}` +
    `&type=album&limit=${limit}&market=US`

  async function runSearch(forceRefreshToken = false) {
    const token = await getSpotifyToken({ forceRefresh: forceRefreshToken })
    return fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } })
  }

  try {
    let res = await runSearch()

    // If the cached token has been invalidated upstream (rare, but happens
    // when Spotify rotates credentials or a warm Lambda instance holds an
    // expired token), retry once with a fresh token before giving up.
    if (res.status === 401) {
      invalidateSpotifyToken()
      res = await runSearch(true)
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('spotify-radar upstream failure', res.status, body.slice(0, 200))
      // Return an empty item list with 200 so the client radar can still
      // render movies/TV/books; a Spotify hiccup shouldn't wipe the page.
      return {
        statusCode: 200,
        headers: corsHeaders(origin),
        body: JSON.stringify({ items: [], error: 'Spotify search failed', status: res.status }),
      }
    }

    const data = await res.json()
    // Sort newest-first within the year so the radar surfaces actual fresh drops.
    const items = (data.albums?.items || [])
      .map(normalizeAlbum)
      .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({ items }),
    }
  } catch (err) {
    console.error('spotify-radar error', err.message)
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({ items: [], error: 'Internal error' }),
    }
  }
}
