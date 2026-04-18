/**
 * Spotify Radar Netlify Function
 * Exposes two modes for the Weekly Radar:
 *   - mode=new-releases       → /browse/new-releases (global fresh album drops)
 *   - mode=recommendations    → /recommendations?seed_artists=<csv of artist names>
 *                                (resolves names to IDs server-side)
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'
import { getSpotifyToken } from './_shared/spotifyAuth.js'

function normalizeAlbum(album, extra = {}) {
  return {
    title: album.name,
    creator: (album.artists || []).map((a) => a.name).join(', '),
    type: 'music',
    genre: '',
    releaseDate: album.release_date || '',
    description: '',
    coverUrl: album.images?.[1]?.url || album.images?.[0]?.url || '',
    provider: 'spotify',
    externalId: album.id,
    spotifyUrl: album.external_urls?.spotify || '',
    ...extra,
  }
}

function normalizeTrack(track, extra = {}) {
  return {
    title: track.name,
    creator: (track.artists || []).map((a) => a.name).join(', '),
    type: 'music',
    genre: '',
    releaseDate: track.album?.release_date || '',
    description: '',
    coverUrl: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
    provider: 'spotify',
    externalId: track.id,
    spotifyUrl: track.external_urls?.spotify || '',
    ...extra,
  }
}

async function resolveArtistIds(names, token) {
  const ids = []
  for (const name of names) {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) continue
    const data = await res.json()
    const id = data.artists?.items?.[0]?.id
    if (id) ids.push(id)
  }
  return ids
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || ''

  if (event.httpMethod === 'OPTIONS') return handleOptions(origin)
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const mode = event.queryStringParameters?.mode || 'new-releases'
  const seedsParam = (event.queryStringParameters?.seeds || '').trim()

  try {
    const token = await getSpotifyToken()

    if (mode === 'new-releases') {
      const res = await fetch(
        'https://api.spotify.com/v1/browse/new-releases?country=US&limit=20',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        return { statusCode: 502, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Spotify new releases failed' }) }
      }
      const data = await res.json()
      const items = (data.albums?.items || []).map((a) => normalizeAlbum(a))
      return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ results: items }) }
    }

    if (mode === 'recommendations') {
      if (!seedsParam) {
        return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ results: [] }) }
      }
      const names = seedsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5)
      const artistIds = await resolveArtistIds(names, token)
      if (artistIds.length === 0) {
        return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ results: [] }) }
      }
      const seedCsv = artistIds.slice(0, 5).join(',')
      const recUrl = `https://api.spotify.com/v1/recommendations?seed_artists=${seedCsv}&limit=15`
      const recRes = await fetch(recUrl, { headers: { Authorization: `Bearer ${token}` } })
      if (!recRes.ok) {
        return { statusCode: 502, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Spotify recommendations failed' }) }
      }
      const recData = await recRes.json()
      const reason = names[0] ? `Because you follow ${names[0]}` : 'Recommended for you'
      const items = (recData.tracks || []).map((t) => normalizeTrack(t, { reason }))
      return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ results: items }) }
    }

    return { statusCode: 400, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Unknown mode' }) }
  } catch (err) {
    console.error('spotify-radar error', err.message)
    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'Internal error' }),
    }
  }
}
