export function filterCatalog(items, filters) {
  return items.filter((item) => {
    if (filters.type && filters.type !== 'all' && item.type !== filters.type) return false
    if (filters.status && filters.status !== 'all' && item.status !== filters.status) return false
    if (filters.rating && item.rating < filters.rating) return false
    if (filters.genre && item.genre && !item.genre.toLowerCase().includes(filters.genre.toLowerCase())) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      return (
        item.title.toLowerCase().includes(q) ||
        (item.creator && item.creator.toLowerCase().includes(q))
      )
    }
    return true
  })
}

export function sortCatalog(items, sortBy) {
  const sorted = [...items]
  switch (sortBy) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    case 'dateAdded':
    default:
      return sorted.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
  }
}

export const MEDIA_TYPES = [
  { value: 'music', label: 'Music', color: 'var(--color-accent-music)' },
  { value: 'movie', label: 'Movies', color: 'var(--color-accent-movies)' },
  { value: 'tv', label: 'TV', color: 'var(--color-accent-tv)' },
  { value: 'book', label: 'Books', color: 'var(--color-accent-books)' },
]

export const STATUS_OPTIONS = [
  { value: 'watching', label: 'In Progress' },
  { value: 'finished', label: 'Finished' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'want', label: 'Want to Try' },
]

export function getMediaColor(type) {
  const found = MEDIA_TYPES.find((t) => t.value === type)
  return found ? found.color : 'var(--color-accent-primary)'
}
