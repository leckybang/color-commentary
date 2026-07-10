/**
 * shareCard — turn a month's insights into a shareable story-format image.
 *
 * Builds a self-contained SVG, rasterizes it to PNG, and hands the blob back
 * to the UI so the user can preview it, download it, or send it to the native
 * share sheet. Cover art is fetched and inlined as data URIs (so the canvas
 * export is never tainted); hosts that block CORS (e.g. Google Books) are
 * retried through the images.weserv.nl proxy, and anything that still fails
 * falls back to a colored placeholder tile.
 */

const W = 1080
const H = 1350

const SITE_URL = 'color-commentary.netlify.app'

const INK = '#1b1a16'
const PORCELAIN = '#f0efea'
const CARD = '#fbfaf7'
const PINK = '#d95f8f'
const SEC = '#54524a'
const MUTED = '#8f8d81'

const TYPE_COLORS = {
  music: '#a88ff0',
  movie: '#f2799f',
  tv: '#7fadea',
  book: '#8fae4e',
}
const TYPE_LABELS = { music: 'Music', movie: 'Film', tv: 'TV', book: 'Book' }

const DISPLAY_FONT = "'Bricolage Grotesque', Helvetica, Arial, sans-serif"
const BODY_FONT = 'Helvetica, Arial, sans-serif'

// Load the vendored Bricolage woff2 (same origin, so no CORS drama) once and
// cache the data URI — SVGs rendered via <img> can't reach external fonts,
// but an inlined @font-face works.
let fontPromise = null
function getDisplayFontDataUrl() {
  if (!fontPromise) {
    fontPromise = (async () => {
      try {
        const res = await fetch('/fonts/bricolage-grotesque-latin.woff2')
        if (!res.ok) return null
        const bytes = new Uint8Array(await res.arrayBuffer())
        let bin = ''
        for (let i = 0; i < bytes.length; i += 0x8000) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
        }
        return 'data:font/woff2;base64,' + btoa(bin)
      } catch {
        return null // Helvetica fallback — card still renders
      }
    })()
  }
  return fontPromise
}

function escapeXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncate(s = '', n) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

async function blobToDataUrl(blob) {
  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(blob)
  })
}

async function fetchBlob(url, timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, mode: 'cors', referrerPolicy: 'no-referrer' })
    if (!res.ok) return null
    return await res.blob()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetch an image and inline it as a data URI. Tries the source directly,
 * then falls back to the weserv image proxy for hosts that don't send CORS
 * headers (Google Books covers, most notably). Null if both fail.
 */
async function fetchAsDataUrl(url, timeoutMs = 4500) {
  if (!url) return null
  try {
    const blob = await fetchBlob(url, timeoutMs)
    if (blob) return await blobToDataUrl(blob)
  } catch {
    /* fall through to proxy */
  }
  try {
    const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&w=200&fit=cover`
    const blob = await fetchBlob(proxied, timeoutMs)
    if (blob) return await blobToDataUrl(blob)
  } catch {
    /* placeholder tile it is */
  }
  return null
}

/** Cover <image> with rounded corners, or a colored placeholder tile. */
function coverSvg({ dataUrl, type, x, y, w, h, clipId }) {
  const color = TYPE_COLORS[type] || '#c49bff'
  if (dataUrl) {
    return `
      <clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/></clipPath>
      <image href="${dataUrl}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="none" stroke="${INK}" stroke-width="2"/>`
  }
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${color}" fill-opacity="0.25"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="none" stroke="${INK}" stroke-width="2"/>
    <text x="${x + w / 2}" y="${y + h / 2 + 12}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="bold" fill="${INK}">${escapeXml((TYPE_LABELS[type] || '?')[0])}</text>`
}

/** The app logo — the wordmark's 2x2 pastel dot grid. */
function logoSvg(x, y, size) {
  const tile = (size - 6) / 2
  const rx = size * 0.22
  const sq = (tx, ty, color) => `<rect x="${tx}" y="${ty}" width="${tile}" height="${tile}" rx="${rx}" fill="${color}"/>`
  return `
    <g transform="translate(${x} ${y})">
      ${sq(0, 0, TYPE_COLORS.music)}
      ${sq(tile + 6, 0, TYPE_COLORS.movie)}
      ${sq(0, tile + 6, TYPE_COLORS.tv)}
      ${sq(tile + 6, tile + 6, TYPE_COLORS.book)}
    </g>`
}

function buildSvg(insights, coverMap, username, fontDataUrl) {
  const { count, monthLabel, usingMonth, breakdown, faves, fiveStars } = insights
  const periodText = usingMonth ? `titles finished in ${monthLabel}` : 'titles finished, all time'

  const pick = fiveStars?.[0] || null
  // Don't show the five-star pick twice — the spotlight is its home.
  const rowFaves = (pick ? faves.filter((f) => f.id !== pick.id) : faves).slice(0, 3)

  // ── Header: wordmark left, @username pill right ──
  let usernamePill = ''
  if (username) {
    const label = `@${username}`
    const pillW = Math.min(430, 34 + label.length * 15.5)
    const pillX = 990 - pillW
    usernamePill = `
      <rect x="${pillX}" y="84" width="${pillW}" height="52" rx="26" fill="${PINK}"/>
      <text x="${pillX + pillW / 2}" y="118" text-anchor="middle" font-family="${DISPLAY_FONT}" font-size="26" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>`
  }

  // ── Flowing vertical layout ──
  // Big stat block
  const statBlock = `
    <text x="84" y="392" font-family="${DISPLAY_FONT}" font-size="235" font-weight="800" fill="${INK}" letter-spacing="-8">${count}</text>
    <text x="90" y="452" font-family="${DISPLAY_FONT}" font-size="42" font-weight="800" fill="${PINK}" letter-spacing="-1">${escapeXml(periodText)}</text>
    ${breakdown ? `<text x="90" y="512" font-family="${DISPLAY_FONT}" font-size="32" font-weight="700" fill="${SEC}">${escapeXml(breakdown)}</text>` : ''}`

  // Favorites rows
  const rowsStart = 590
  const rowH = 134
  const rowGap = 18
  const faveHeader = rowFaves.length > 0
    ? `<text x="90" y="${rowsStart - 22}" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="bold" fill="${MUTED}" letter-spacing="5">FAVORITES</text>`
    : ''
  const faveRows = rowFaves.map((f, i) => {
    const y = rowsStart + i * (rowH + rowGap)
    const color = TYPE_COLORS[f.type] || '#c49bff'
    const stars = '★'.repeat(f.rating) + '☆'.repeat(Math.max(0, 5 - f.rating))
    return `
      <g transform="translate(90 ${y})">
        <rect x="0" y="0" width="900" height="${rowH}" rx="20" fill="${CARD}" stroke="${INK}" stroke-width="2.5"/>
        <rect x="0" y="13" width="9" height="${rowH - 26}" rx="4.5" fill="${color}"/>
        ${coverSvg({ dataUrl: coverMap.get(f.id), type: f.type, x: 26, y: 12, w: 80, h: rowH - 24, clipId: `fave-cov-${i}` })}
        <text x="130" y="58" font-family="${DISPLAY_FONT}" font-size="33" font-weight="800" fill="${INK}" letter-spacing="-0.5">${escapeXml(truncate(f.title, 30))}</text>
        <text x="130" y="98" font-family="Helvetica, Arial, sans-serif" font-size="25" fill="${SEC}">${escapeXml(truncate(f.creator || TYPE_LABELS[f.type] || '', 36))}</text>
        <text x="872" y="80" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="${PINK}" letter-spacing="2">${stars}</text>
      </g>`
  }).join('')

  // Five-star spotlight flows right after the rows
  let fiveStarBlock = ''
  if (pick) {
    const y = rowsStart + rowFaves.length * (rowH + rowGap) + 14
    const extra = fiveStars.length > 1 ? `  ·  +${fiveStars.length - 1} more` : ''
    fiveStarBlock = `
      <g transform="translate(90 ${y})">
        <rect x="0" y="0" width="900" height="150" rx="20" fill="#f0b429" fill-opacity="0.16"/>
        <rect x="0" y="0" width="900" height="150" rx="20" fill="none" stroke="${INK}" stroke-width="2.5"/>
        ${coverSvg({ dataUrl: coverMap.get(pick.id), type: pick.type, x: 24, y: 14, w: 82, h: 122, clipId: 'fivestar-cov' })}
        <text x="132" y="52" font-family="Helvetica, Arial, sans-serif" font-size="21" font-weight="bold" fill="#a16207" letter-spacing="4">FIVE-STAR PICK${escapeXml(extra)}</text>
        <text x="132" y="98" font-family="${DISPLAY_FONT}" font-size="33" font-weight="800" fill="${INK}" letter-spacing="-0.5">${escapeXml(truncate(pick.title, 29))}</text>
        ${pick.creator ? `<text x="132" y="132" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="${SEC}">${escapeXml(truncate(pick.creator, 36))}</text>` : ''}
        <text x="872" y="88" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#d97706" letter-spacing="2">★★★★★</text>
      </g>`
  }

  const fontFace = fontDataUrl
    ? `<style>@font-face{font-family:'Bricolage Grotesque';src:url(${fontDataUrl}) format('woff2');font-weight:200 800;font-style:normal;}</style>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${fontFace}
    <rect width="${W}" height="${H}" fill="${PORCELAIN}"/>
    <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="34" fill="none" stroke="${INK}" stroke-width="3"/>

    <!-- Wordmark + owner -->
    ${logoSvg(90, 76, 66)}
    <text x="176" y="106" font-family="${DISPLAY_FONT}" font-size="36" font-weight="800" fill="${INK}" letter-spacing="-1">color</text>
    <text x="176" y="142" font-family="${DISPLAY_FONT}" font-size="36" font-weight="800" fill="${INK}" letter-spacing="-1">commentary</text>
    <rect x="176" y="150" width="212" height="6" rx="3" fill="${PINK}"/>
    ${usernamePill}

    ${statBlock}

    ${faveHeader}
    ${faveRows}

    ${fiveStarBlock}

    <!-- Footer: one centered ink pill -->
    ${(() => {
      const label = username ? `follow @${username} · ${SITE_URL}` : SITE_URL
      const pillW = Math.min(940, 56 + label.length * 12.6)
      const pillX = (W - pillW) / 2
      return `
        <rect x="${pillX}" y="1278" width="${pillW}" height="54" rx="27" fill="${INK}"/>
        <text x="${W / 2}" y="1313" text-anchor="middle" font-family="${DISPLAY_FONT}" font-size="23" font-weight="700" fill="${PORCELAIN}">${escapeXml(label)}</text>`
    })()}
  </svg>`
}

function svgToPngBlob(svgString) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, W, H)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
    }
    img.onerror = () => reject(new Error('SVG render failed'))
    // Unicode-safe base64 encode
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Build the insight card PNG. Fetches cover art for the favorites and the
 * five-star pick (best effort — placeholders on failure).
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
export async function buildInsightCard(insights, { username = '' } = {}) {
  // Collect the covers the card needs: favorites + top five-star pick.
  const wanted = new Map()
  for (const f of insights.faves || []) wanted.set(f.id, f.coverUrl)
  const topFive = insights.fiveStars?.[0]
  if (topFive) wanted.set(topFive.id, topFive.coverUrl)

  const coverMap = new Map()
  const [fontDataUrl] = await Promise.all([
    getDisplayFontDataUrl(),
    ...[...wanted.entries()].map(async ([id, url]) => {
      coverMap.set(id, await fetchAsDataUrl(url))
    }),
  ])

  const svg = buildSvg(insights, coverMap, username, fontDataUrl)
  const blob = await svgToPngBlob(svg)
  const filename = `color-commentary-${insights.usingMonth ? insights.monthLabel.toLowerCase() : 'wrapped'}.png`
  return { blob, filename }
}

/** Whether the native share sheet can take this file. */
export function canShareFile(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' })
  return !!(navigator.canShare && navigator.canShare({ files: [file] }))
}

/**
 * Send a built card to the native share sheet.
 * @returns {Promise<'shared'|'cancelled'|'unsupported'>}
 */
export async function shareCardBlob(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My month in media' })
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled'
    }
  }
  return 'unsupported'
}
