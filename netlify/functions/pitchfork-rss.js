/**
 * Pitchfork Best New Music — server-side RSS proxy.
 *
 * Pitchfork has no JSON API, but they publish an RSS feed of "Best New
 * Albums" reviews. The old /rss/reviews/best/albums/ path now 404s; the
 * live feed is:
 *   https://pitchfork.com/feed/reviews/best/albums/rss
 *
 * Feed shape (differs from the old one): <title> is the album name alone,
 * the artist only appears in the review URL slug, <dc:creator> is the
 * REVIEW AUTHOR (not the artist), and <media:thumbnail> carries real cover
 * art.
 *
 * We fetch + parse it server-side (avoiding browser CORS) and return a tidy
 * JSON list. Failures degrade gracefully to an empty array so they don't
 * break the rest of the Radar.
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'

const FEED_URL = 'https://pitchfork.com/feed/reviews/best/albums/rss'
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

// Truncate at a word boundary with an ellipsis — a blind slice() cuts
// mid-word ("…one of t") and reads like a rendering bug.
function clip(s, max) {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const atWord = cut.slice(0, cut.lastIndexOf(' '))
  return (atWord || cut).replace(/[\s,;:.—–-]+$/, '') + '…'
}

// Self-closing tags like <media:thumbnail url="…"/> carry data in attributes.
function pickAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}="([^"]*)"`, 'i')
  return xml.match(re)?.[1] || ''
}

// The feed's <title> is just the album name; the artist only lives in the
// review URL slug ("/reviews/albums/<artist-slug>-<album-slug>/"). Peel the
// slugified album title off the end and de-slugify what's left. When the
// slug doesn't end with the album title (special characters, retitled URLs)
// return '' rather than guess.
function artistFromLink(link, title) {
  const m = link.match(/\/reviews\/albums\/([^/?#]+)/)
  if (!m) return ''
  const slug = m[1].toLowerCase()
  const titleSlug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!titleSlug || !slug.endsWith(titleSlug)) return ''
  const artistSlug = slug.slice(0, slug.length - titleSlug.length).replace(/-+$/, '')
  if (!artistSlug) return ''
  return artistSlug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function parseFeed(xml) {
  const items = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml)) && items.length < MAX_ITEMS) {
    const block = m[1]
    const title = pickTag(block, 'title')
    const link = pickTag(block, 'link')
    const desc = stripHtml(pickTag(block, 'description'))
    const pubDate = pickTag(block, 'pubDate')
    if (!title) continue
    const creator = artistFromLink(link, title)
    items.push({
      title,
      creator,
      type: 'music',
      source: 'Pitchfork · Best New Music',
      blurb: clip(desc, 240),
      reviewUrl: link,
      coverUrl: pickAttr(block, 'media:thumbnail', 'url'),
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
