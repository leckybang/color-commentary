/**
 * Returns external "find on" links for a media item.
 *
 * AFFILIATE SETUP:
 * - Amazon Associates: Append `&tag=YOUR-TAG-20` to Amazon URLs
 * - Bookshop.org: Replace `bookshop.org/search` with `bookshop.org/a/YOUR_AFFILIATE_ID/search`
 * - Apple Music/TV: Join Apple Services Performance Partners, use their link generator
 * - Spotify: No affiliate program, but drives engagement
 */

const AFFILIATE_TAG = import.meta.env.VITE_AMAZON_PA_PARTNER_TAG || ''
const BOOKSHOP_ID = ''   // Set your Bookshop.org affiliate ID here

function amazonTag() {
  return AFFILIATE_TAG ? `&tag=${AFFILIATE_TAG}` : ''
}

function bookshopPrefix() {
  return BOOKSHOP_ID ? `/a/${BOOKSHOP_ID}` : ''
}

export function getMediaLinks(type, title, creator) {
  const q = encodeURIComponent(`${title} ${creator}`.trim())
  const tOnly = encodeURIComponent(title.trim())

  switch (type) {
    case 'music':
      return [
        { label: 'Spotify', url: `https://open.spotify.com/search/${q}`, color: '#1DB954' },
        { label: 'Apple Music', url: `https://music.apple.com/us/search?term=${q}`, color: '#fc3c44' },
      ]
    case 'movie':
      return [
        { label: 'Apple TV', url: `https://tv.apple.com/search?term=${tOnly}`, color: '#000000' },
        { label: 'Amazon', url: `https://www.amazon.com/s?k=${q}&i=instant-video${amazonTag()}`, color: '#ff9900' },
      ]
    case 'tv':
      return [
        { label: 'Apple TV', url: `https://tv.apple.com/search?term=${tOnly}`, color: '#000000' },
        { label: 'Amazon', url: `https://www.amazon.com/s?k=${q}&i=instant-video${amazonTag()}`, color: '#ff9900' },
      ]
    case 'book':
      return [
        { label: 'Bookshop.org', url: `https://bookshop.org${bookshopPrefix()}/search?keywords=${q}`, color: '#3a8a50' },
        { label: 'Amazon', url: `https://www.amazon.com/s?k=${q}&i=stripbooks${amazonTag()}`, color: '#ff9900' },
      ]
    default:
      return []
  }
}
