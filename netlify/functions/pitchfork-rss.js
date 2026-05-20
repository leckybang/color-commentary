/**
 * Pitchfork Best New Music — server-side RSS proxy.
 *
 * Pitchfork has no JSON API, but they publish a stable RSS feed of "Best
 * New Music" album reviews:
 *   https://pitchfork.com/rss/reviews/best/albums/
 *
 * We fetch + parse it server-side (avoiding browser CORS) and return a tidy
 * JSON list. Failures degrade gracefully to an empty array so they don't
 * break the rest of the Radar.
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'

const FEED_URL = 'https://pitchfork.com/rss/reviews/best/albums/'
const MAX_ITEMS = 8
// Pitchfork RSS is largely static between updates; cache so warm Lambdas
// don't re-fetch every radar build.
let cache = { at: 0, items: null }
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function pickTag(xml, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i')
  const m = xml.match(re)
  if (!m) return ''
  let v = m[1].trim()
  // Strip CDATA wrappers
  v = v.replace(/^<!\[CDATA\[([\s\S]*?)]]>$/i, '$1').trim()
  return v
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

// Pitchfork titles look like "Artist Name: Album Title" — split into the
// shape the radar expects ({ creator, title }).
function splitTitle(rawTitle) {
  const t = rawTitle.replace(/\s+/g, ' ').trim()
  const i = t.indexOf(': ')
  if (i > 0) return { creator: t.slice(0, i).trim(), title: t.slice(i + 2).trim() }
  return { creator: '', title: t }
}

function parseFeed(xml) {
  const items = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml)) && items.length < MAX_ITEMS) {
    const block = m[1]
    const rawTitle = pickTag(block, 'title')
    const link = pickTag(block, 'link')
    const desc = stripHtml(pickTag(block, 'description'))
    const pubDate = pickTag(block, 'pubDate')
    if (!rawTitle) continue
    const { creator, title } = splitTitle(rawTitle)
    items.push({
      title,
      creator,
      type: 'music',
      source: 'Pitchfork — Best New Music',
      blurb: desc.slice(0, 240),
      reviewUrl: link,
      releaseDate: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : '',
      isTastemaker: true,
      provider: 'pitchfork',
      externalId: link || `${creator}-${title}`,
    })
  }
  return items
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || ''
  if (event.httpMethod === 'OPTIONS') return handleOptions(origin)
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders(origin), body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const now = Date.now()
  if (cache.items && now - cache.at < CACHE_TTL_MS) {
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ items: cache.items, cached: true }) }
  }

  try {
    const res = await fetch(FEED_URL, {
      headers: {
        // Pitchfork's RSS server rejects requests without a UA / wrong Accept.
        'User-Agent': 'ColorCommentaryBot/1.0 (+https://color-commentary.netlify.app)',
        Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
      },
    })
    if (!res.ok) {
      console.warn('pitchfork-rss upstream', res.status)
      return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ items: [], status: res.status }) }
    }
    const xml = await res.text()
    const items = parseFeed(xml)
    cache = { at: now, items }
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ items }) }
  } catch (err) {
    console.error('pitchfork-rss error', err.message)
    return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ items: [], error: 'fetch failed' }) }
  }
}
