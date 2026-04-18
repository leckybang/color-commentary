/**
 * Spotify Search Netlify Function
 * Uses Client Credentials Flow to get an app-level token, then proxies search queries.
 * Env vars required: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'
import { getSpotifyToken } from './_shared/spotifyAuth.js'

function normalizeAlbum(album) {
  return {
    kind: 'media',
    provider: 'spotify',
    externalId: album.id,
    type: 'music',
    title: album.name,
    creator: (album.artists || []).map(a => a.name).join(', '),
    year: (album.release_date || '').slice(0, 4),
    coverUrl: album.images?.[1]?.url || album.images?.[0]?.url || '',
    spotifyUrl: album.external_urls?.spotify || '',
    subtype: 'album',
  }
}

function normalizeTrack(track) {
  return {
    kind: 'media',
    provider: 'spotify',
    externalId: track.id,
    type: 'music',
    title: track.name,
    creator: (track.artists || []).map(a => a.name).join(', '),
    year: (track.album?.release_date || '').slice(0, 4),
    coverUrl: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
    spotifyUrl: track.external_urls?.spotify || '',
    subtype: 'track',
  }
}

function normalizeArtist(artist) {
  return {
    kind: 'media',
    provider: 'spotify',
    externalId: artist.id,
    type: 'music',
    title: artist.name,
    creator: '',
    year: '',
    coverUrl: artist.images?.[1]?.url || artist.images?.[0]?.url || '',
    spotifyUrl: artist.external_urls?.spotify || '',
    subtype: 'artist',
  }
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || ''

  if (event.httpMethod === 'OPTIONS') return handleOptions(origin)
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const query = (event.queryStringParameters?.q || '').trim()
  if (!query || query.length < 2 || query.length > 100) {
    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Invalid query' }) }
  }

  try {
    const token = await getSpotifyToken()
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album,track,artist&limit=4`
    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      return { statusCode: 502, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Spotify search failed' }) }
    }

    const data = await res.json()
    const results = [
      ...(data.albums?.items || []).map(normalizeAlbum),
      ...(data.artists?.items || []).map(normalizeArtist),
      ...(data.tracks?.items || []).map(normalizeTrack),
    ].slice(0, 8)

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({ results }),
    }
  } catch (err) {
    console.error('spotify-search error', err.message)
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'Internal error' }),
    }
  }
}
