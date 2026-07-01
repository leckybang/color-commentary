/**
 * shareCard — turn a month's insights into a shareable story-format image.
 *
 * Builds a self-contained SVG (no external fonts or images, so the canvas
 * export is never tainted), rasterizes it to PNG, and hands it to the native
 * share sheet when available — otherwise downloads it.
 */

const W = 1080
const H = 1350

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

function buildSvg(insights, displayName) {
  const { count, monthLabel, usingMonth, breakdown, faves, fiveStarCount, topGenre } = insights
  const periodText = usingMonth ? `things finished in ${monthLabel}` : 'things finished, all time'
  const name = displayName ? escapeXml(displayName.split(' ')[0]) : ''

  // Favorite rows
  const faveRows = faves.map((f, i) => {
    const y = 770 + i * 150
    const color = TYPE_COLORS[f.type] || '#c49bff'
    const stars = '★'.repeat(f.rating) + '☆'.repeat(Math.max(0, 5 - f.rating))
    return `
      <g transform="translate(90 ${y})">
        <rect x="0" y="0" width="900" height="120" rx="20" fill="#ffffff" fill-opacity="0.05"/>
        <rect x="0" y="0" width="8" height="120" rx="4" fill="${color}"/>
        <text x="42" y="50" font-family="Georgia, serif" font-size="38" font-weight="bold" fill="#ede8f5">${escapeXml(truncate(f.title, 30))}</text>
        <text x="42" y="92" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#a99fc0">${escapeXml(truncate(f.creator || TYPE_LABELS[f.type] || '', 34))}</text>
        <text x="858" y="72" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="${color}" letter-spacing="2">${stars}</text>
      </g>`
  }).join('')

  const faveHeader = faves.length > 0
    ? `<text x="90" y="720" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="bold" fill="#6e6488" letter-spacing="4">FAVORITES</text>`
    : ''

  // A small footer fact
  const footerBits = []
  if (fiveStarCount > 0) footerBits.push(`${fiveStarCount} five-star ${fiveStarCount === 1 ? 'pick' : 'picks'}`)
  if (topGenre) footerBits.push(`mostly ${topGenre}`)
  const footerFact = footerBits.join('  ·  ')

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

    <!-- Wordmark -->
    <g transform="translate(90 110)">
      <circle cx="26" cy="20" r="26" fill="none" stroke="#c49bff" stroke-width="6"/>
      <circle cx="62" cy="20" r="26" fill="none" stroke="#ff7a8a" stroke-width="6"/>
      <text x="110" y="32" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#ede8f5" letter-spacing="1">Color Commentary</text>
    </g>

    <!-- Big stat -->
    <text x="90" y="430" font-family="Georgia, serif" font-size="300" font-weight="bold" fill="#ffffff">${count}</text>
    <text x="90" y="510" font-family="Helvetica, Arial, sans-serif" font-size="46" fill="#d4a0ff">${escapeXml(periodText)}</text>

    <!-- Breakdown -->
    ${breakdown ? `<text x="90" y="600" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="bold" fill="#ede8f5">${escapeXml(breakdown)}</text>` : ''}

    ${faveHeader}
    ${faveRows}

    <!-- Footer -->
    ${footerFact ? `<text x="90" y="1240" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#a99fc0">${escapeXml(footerFact)}</text>` : ''}
    <text x="990" y="1290" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#6e6488">${name ? name + ' · ' : ''}color-commentary</text>
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

function downloadBlob(blob, filename) {
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
 * Generate the card and share or download it.
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export async function shareInsightCard(insights, { displayName } = {}) {
  const svg = buildSvg(insights, displayName)
  const blob = await svgToPngBlob(svg)
  const filename = `color-commentary-${insights.usingMonth ? insights.monthLabel.toLowerCase() : 'wrapped'}.png`
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My month in media' })
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled'
      // fall through to download on any other share failure
    }
  }
  downloadBlob(blob, filename)
  return 'downloaded'
}
