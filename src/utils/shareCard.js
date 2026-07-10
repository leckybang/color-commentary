/**
 * shareCard — turn a month's insights into a shareable story-format image.
 *
 * Builds a self-contained SVG, rasterizes it to PNG, and hands the blob back
 * to the UI so the user can preview it, download it, or send it to the native
 * share sheet. Cover art is fetched and inlined as data URIs (so the canvas
 * export is never tainted); anything that fails to load falls back to a
 * colored placeholder tile.
 */

const W = 1080
const H = 1350

const SITE_URL = 'color-commentary.netlify.app'

const TYPE_COLORS = {
  music: '#d4a0ff',
  movie: '#ff7a8a',
  tv: '#7ab8ff',
  book: '#7fe0a0',
}
const TYPE_LABELS = { music: 'Music', movie: 'Film', tv: 'TV', book: 'Book' }

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

/** Fetch an image and inline it as a data URI. Null on any failure. */
async function fetchAsDataUrl(url, timeoutMs = 4500) {
  if (!url) return null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, { signal: ctrl.signal, mode: 'cors', referrerPolicy: 'no-referrer' })
    clearTimeout(timer)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** Cover <image> with rounded corners, or a colored placeholder tile. */
function coverSvg({ dataUrl, type, x, y, w, h, clipId }) {
  const color = TYPE_COLORS[type] || '#c49bff'
  if (dataUrl) {
    return `
      <clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/></clipPath>
      <image href="${dataUrl}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>`
  }
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${color}" fill-opacity="0.18"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="none" stroke="${color}" stroke-opacity="0.4" stroke-width="2"/>
    <text x="${x + w / 2}" y="${y + h / 2 + 12}" text-anchor="middle" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="${color}">${escapeXml((TYPE_LABELS[type] || '?')[0])}</text>`
}

/** The app logo — same 2x2 palette as the favicon, so the card matches. */
function logoSvg(x, y, size) {
  const s = size / 48
  const r = (n) => (n * s).toFixed(2)
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${size}" height="${size}" rx="${r(11)}" fill="#110d18"/>
      <rect x="${r(9)}" y="${r(9)}" width="${r(14.5)}" height="${r(14.5)}" rx="${r(4.5)}" fill="#a78bfa"/>
      <rect x="${r(24.5)}" y="${r(9)}" width="${r(14.5)}" height="${r(14.5)}" rx="${r(4.5)}" fill="#fb7185"/>
      <rect x="${r(9)}" y="${r(24.5)}" width="${r(14.5)}" height="${r(14.5)}" rx="${r(4.5)}" fill="#22d3ee"/>
      <rect x="${r(24.5)}" y="${r(24.5)}" width="${r(14.5)}" height="${r(14.5)}" rx="${r(4.5)}" fill="#34d399"/>
      <circle cx="${r(24)}" cy="${r(24)}" r="${r(2.4)}" fill="#110d18"/>
      <circle cx="${r(24)}" cy="${r(24)}" r="${r(1.3)}" fill="#ffffff"/>
    </g>`
}

function buildSvg(insights, coverMap) {
  const { count, monthLabel, usingMonth, breakdown, faves, fiveStars, topGenre } = insights
  const periodText = usingMonth ? `things finished in ${monthLabel}` : 'things finished, all time'

  // Favorite rows — with cover art
  const faveRows = faves.map((f, i) => {
    const y = 660 + i * 158
    const color = TYPE_COLORS[f.type] || '#c49bff'
    const stars = '★'.repeat(f.rating) + '☆'.repeat(Math.max(0, 5 - f.rating))
    return `
      <g transform="translate(90 ${y})">
        <rect x="0" y="0" width="900" height="142" rx="20" fill="#ffffff" fill-opacity="0.05"/>
        <rect x="0" y="0" width="8" height="142" rx="4" fill="${color}"/>
        ${coverSvg({ dataUrl: coverMap.get(f.id), type: f.type, x: 26, y: 12, w: 86, h: 118, clipId: `fave-cov-${i}` })}
        <text x="138" y="60" font-family="Georgia, serif" font-size="38" font-weight="bold" fill="#ede8f5">${escapeXml(truncate(f.title, 27))}</text>
        <text x="138" y="102" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#a99fc0">${escapeXml(truncate(f.creator || TYPE_LABELS[f.type] || '', 34))}</text>
        <text x="872" y="84" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="${color}" letter-spacing="2">${stars}</text>
      </g>`
  }).join('')

  const faveHeader = faves.length > 0
    ? `<text x="90" y="628" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="bold" fill="#6e6488" letter-spacing="4">FAVORITES</text>`
    : ''

  // Five-star spotlight — show WHAT it was, with its cover.
  let fiveStarBlock = ''
  if (fiveStars && fiveStars.length > 0) {
    const pick = fiveStars[0]
    const extra = fiveStars.length > 1 ? `  ·  +${fiveStars.length - 1} more` : ''
    fiveStarBlock = `
      <g transform="translate(90 1148)">
        <rect x="0" y="0" width="900" height="126" rx="20" fill="#f5c04a" fill-opacity="0.10"/>
        <rect x="0" y="0" width="900" height="126" rx="20" fill="none" stroke="#f5c04a" stroke-opacity="0.35" stroke-width="2"/>
        ${coverSvg({ dataUrl: coverMap.get(pick.id), type: pick.type, x: 22, y: 14, w: 72, h: 98, clipId: 'fivestar-cov' })}
        <text x="118" y="46" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="bold" fill="#f5c04a" letter-spacing="4">FIVE-STAR PICK${escapeXml(extra)}</text>
        <text x="118" y="92" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#ede8f5">${escapeXml(truncate(pick.title, 30))}</text>
        <text x="872" y="76" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#f5c04a" letter-spacing="2">★★★★★</text>
      </g>`
  } else if (topGenre) {
    fiveStarBlock = `<text x="90" y="1220" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#a99fc0">mostly ${escapeXml(topGenre)}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1a1023"/>
        <stop offset="0.55" stop-color="#2a1840"/>
        <stop offset="1" stop-color="#130d1c"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.32" r="0.6">
        <stop offset="0" stop-color="#c49bff" stop-opacity="0.35"/>
        <stop offset="1" stop-color="#c49bff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>

    <!-- Wordmark with the real app logo -->
    ${logoSvg(90, 78, 64)}
    <text x="174" y="122" font-family="Georgia, serif" font-size="38" font-weight="bold" fill="#ede8f5" letter-spacing="1">Color Commentary</text>

    <!-- Big stat -->
    <text x="90" y="420" font-family="Georgia, serif" font-size="260" font-weight="bold" fill="#ffffff">${count}</text>
    <text x="90" y="490" font-family="Helvetica, Arial, sans-serif" font-size="46" fill="#d4a0ff">${escapeXml(periodText)}</text>

    <!-- Breakdown -->
    ${breakdown ? `<text x="90" y="566" font-family="Helvetica, Arial, sans-serif" font-size="38" font-weight="bold" fill="#ede8f5">${escapeXml(breakdown)}</text>` : ''}

    ${faveHeader}
    ${faveRows}

    ${fiveStarBlock}

    <!-- Footer: where to find the app -->
    <text x="990" y="1316" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#8d82a8">${SITE_URL}</text>
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
export async function buildInsightCard(insights) {
  // Collect the covers the card needs: favorites + top five-star pick.
  const wanted = new Map()
  for (const f of insights.faves || []) wanted.set(f.id, f.coverUrl)
  const topFive = insights.fiveStars?.[0]
  if (topFive) wanted.set(topFive.id, topFive.coverUrl)

  const coverMap = new Map()
  await Promise.all(
    [...wanted.entries()].map(async ([id, url]) => {
      coverMap.set(id, await fetchAsDataUrl(url))
    })
  )

  const svg = buildSvg(insights, coverMap)
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
