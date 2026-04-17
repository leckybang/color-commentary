import { useState } from 'react'
import { Plus, LayoutGrid, List, Music, Film, Tv, BookOpen, Trash2, Pin, PinOff, GripVertical, ArrowUp, ArrowDown, Sparkles, Target, Library, Play, Check, X } from 'lucide-react'
import { useCatalog } from '../hooks/useCatalog'
import { useNextUp } from '../hooks/useNextUp'
import MediaCard from '../components/common/MediaCard'
import FilterBar from '../components/common/FilterBar'
import StarRating from '../components/common/StarRating'
import Modal from '../components/common/Modal'
import ExternalLinks from '../components/common/ExternalLinks'
import MediaPickerInput from '../components/common/MediaPickerInput'
import { filterCatalog, sortCatalog, MEDIA_TYPES, STATUS_OPTIONS, getMediaColor } from '../utils/filterUtils'

const EMPTY_ITEM = { title: '', creator: '', type: null, genre: '', status: 'want', rating: 0, review: '', coverUrl: '', year: '' }

const TYPE_TO_SEARCH_TYPES = {
  music: ['music'],
  movie: ['movie'],
  tv: ['tv'],
  book: ['book'],
}

// Ordered sections rendered when no status filter is active
const STATUS_SECTIONS = [
  { key: 'want',     label: 'Want to Try',  icon: Library, color: 'var(--color-accent-primary)' },
  { key: 'watching', label: 'In Progress',  icon: Play,    color: 'var(--color-accent-tv)' },
  { key: 'finished', label: 'Finished',     icon: Check,   color: 'var(--color-accent-books)' },
  { key: 'dropped',  label: 'Dropped',      icon: X,       color: 'var(--color-text-muted)' },
]

export default function Catalog() {
  const { items, addItem, updateItem, deleteItem } = useCatalog()
  const { itemIds: nextUpIds, addToNextUp, removeFromNextUp, reorder: reorderNextUp, isInNextUp, isFull: nextUpFull, MAX_NEXT_UP } = useNextUp()
  const [filters, setFilters] = useState({})
  const [sortBy, setSortBy] = useState('dateAdded')
  const [viewMode, setViewMode] = useState('grid')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [formData, setFormData] = useState(EMPTY_ITEM)
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)

  const filtered = sortCatalog(filterCatalog(items, filters), sortBy)
  const hasActiveFilters = !!(filters.type && filters.type !== 'all') ||
    !!(filters.status && filters.status !== 'all') ||
    !!(filters.search && filters.search.trim()) ||
    !!(filters.genre && filters.genre.trim()) ||
    !!filters.rating

  // Build Next Up items (in order) from catalog
  const nextUpItems = nextUpIds
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean)
    .filter((it) => it.status === 'want') // if status changed, drop from Next Up display

  const openAdd = () => {
    setFormData(EMPTY_ITEM)
    setEditItem(null)
    setSaveAttempted(false)
    setShowAddModal(true)
  }

  const openEdit = (item) => {
    setFormData(item)
    setEditItem(item)
    setSaveAttempted(false)
    setShowAddModal(true)
  }

  const handleSave = () => {
    setSaveAttempted(true)
    if (!formData.title.trim() || !formData.type) return
    if (editItem) {
      updateItem(editItem.id, formData)
    } else {
      addItem(formData)
    }
    setShowAddModal(false)
  }

  const handleDelete = () => {
    if (editItem) {
      if (isInNextUp(editItem.id)) removeFromNextUp(editItem.id)
      deleteItem(editItem.id)
      setShowAddModal(false)
    }
  }

  const togglePin = (item, e) => {
    e?.stopPropagation()
    if (isInNextUp(item.id)) {
      removeFromNextUp(item.id)
    } else if (!nextUpFull) {
      addToNextUp(item.id)
    }
  }

  // Drag & drop for Next Up
  const onDragStart = (i) => (e) => {
    setDragIndex(i)
    e.dataTransfer.effectAllowed = 'move'
    // Required for Firefox
    try { e.dataTransfer.setData('text/plain', String(i)) } catch {}
  }
  const onDragOver = (i) => (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const onDrop = (i) => (e) => {
    e.preventDefault()
    if (dragIndex == null || dragIndex === i) return
    reorderNextUp(dragIndex, i)
    setDragIndex(null)
  }
  const onDragEnd = () => setDragIndex(null)

  // Render a Next Up card (compact, with drag handle + up/down arrows for mobile/a11y)
  const renderNextUpCard = (item, i) => {
    const color = getMediaColor(item.type)
    const isDragging = dragIndex === i
    return (
      <div
        key={item.id}
        draggable
        onDragStart={onDragStart(i)}
        onDragOver={onDragOver(i)}
        onDrop={onDrop(i)}
        onDragEnd={onDragEnd}
        onClick={() => openEdit(item)}
        className={`flex items-center gap-3 bg-bg-secondary border rounded-xl p-3 cursor-pointer transition-all ${
          isDragging ? 'opacity-40 border-accent-primary' : 'border-border hover:border-accent-primary/30'
        }`}
        style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--color-accent-primary)' }}
      >
        <div
          className="text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing shrink-0"
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder"
        >
          <GripVertical size={18} />
        </div>
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-accent-primary/15 text-accent-primary text-xs font-bold shrink-0">
          {i + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-text-primary truncate">{item.title}</p>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
            >
              {item.type}
            </span>
          </div>
          {item.creator && <p className="text-xs text-text-muted truncate">{item.creator}</p>}
        </div>
        {/* Accessibility fallback: up/down arrows on mobile/keyboard */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); reorderNextUp(i, i - 1) }}
            disabled={i === 0}
            className="p-1 rounded text-text-muted hover:text-accent-primary hover:bg-bg-hover transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); reorderNextUp(i, i + 1) }}
            disabled={i === nextUpItems.length - 1}
            className="p-1 rounded text-text-muted hover:text-accent-primary hover:bg-bg-hover transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => togglePin(item, e)}
            className="p-1 rounded text-accent-primary hover:bg-accent-primary/10 transition-colors"
            title="Unpin from Next Up"
          >
            <PinOff size={14} />
          </button>
        </div>
      </div>
    )
  }

  // Render an item card in a status section, with optional pin affordance
  const renderCatalogItem = (item) => {
    const color = getMediaColor(item.type)
    const showPin = item.status === 'want' && !isInNextUp(item.id)
    const pinned = isInNextUp(item.id)
    return (
      <div key={item.id} className="relative group">
        <MediaCard item={item} onClick={openEdit} />
        {item.status === 'want' && (
          <button
            type="button"
            onClick={(e) => togglePin(item, e)}
            disabled={showPin && nextUpFull}
            title={
              pinned
                ? 'Unpin from Next Up'
                : nextUpFull
                ? `Next Up is full (${MAX_NEXT_UP} max)`
                : 'Pin to Next Up'
            }
            className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all ${
              pinned
                ? 'bg-accent-primary text-white shadow-md'
                : 'bg-bg-tertiary text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-30'
            }`}
          >
            {pinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
        )}
      </div>
    )
  }

  const renderStatusSection = (section) => {
    let sectionItems = filtered.filter((it) => it.status === section.key)
    // For Want to Try, exclude items already pinned to Next Up
    if (section.key === 'want') {
      sectionItems = sectionItems.filter((it) => !isInNextUp(it.id))
    }
    if (sectionItems.length === 0) return null
    const Icon = section.icon
    return (
      <section key={section.key} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={18} style={{ color: section.color }} />
          <h2 className="text-lg font-semibold text-text-primary">{section.label}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${section.color} 15%, transparent)`, color: section.color }}>
            {sectionItems.length}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionItems.map(renderCatalogItem)}
        </div>
      </section>
    )
  }

  const typeMissing = !editItem && !formData.type

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Catalog</h1>
          <p className="text-text-secondary text-sm mt-1">{items.length} items in your library</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 bg-bg-secondary border border-border rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            <Plus size={16} />
            Add Media
          </button>
        </div>
      </div>

      <div className="mb-6">
        <FilterBar filters={filters} onChange={setFilters} sortBy={sortBy} onSortChange={setSortBy} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-bg-secondary border border-border rounded-2xl">
          <div className="flex justify-center gap-2 mb-4 opacity-30">
            <Music size={32} />
            <Film size={32} />
            <Tv size={32} />
            <BookOpen size={32} />
          </div>
          <h3 className="text-lg font-medium text-text-secondary mb-2">
            {items.length === 0 ? 'Nothing here but potential' : 'No matches found'}
          </h3>
          <p className="text-text-muted text-sm mb-4">
            {items.length === 0
              ? "Every great collection starts with one item. What's the last thing you watched, read, or listened to?"
              : 'Try adjusting your filters. Or accept that nothing is perfect.'}
          </p>
          {items.length === 0 && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Add Your First Item
            </button>
          )}
        </div>
      ) : hasActiveFilters || viewMode === 'list' ? (
        // Flat grid / list when filters active or list view requested
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(renderCatalogItem)}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const color = getMediaColor(item.type)
              return (
                <div
                  key={item.id}
                  onClick={() => openEdit(item)}
                  className="flex items-center gap-4 bg-bg-secondary border border-border rounded-xl p-3 hover:border-accent-primary/30 cursor-pointer transition-all"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}>
                    {item.type === 'music' && <Music size={16} style={{ color }} />}
                    {item.type === 'movie' && <Film size={16} style={{ color }} />}
                    {item.type === 'tv' && <Tv size={16} style={{ color }} />}
                    {item.type === 'book' && <BookOpen size={16} style={{ color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{item.title}</p>
                    <p className="text-sm text-text-muted truncate">{item.creator}</p>
                  </div>
                  {item.rating > 0 && <StarRating rating={item.rating} readonly size={14} />}
                </div>
              )
            })}
          </div>
        )
      ) : (
        // Grouped sections when no filters
        <>
          {/* Next Up — always shown if any items are pinned */}
          {nextUpItems.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-1">
                <Target size={18} className="text-accent-primary" />
                <h2 className="text-lg font-semibold text-text-primary">Next Up</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary">
                  {nextUpItems.length} / {MAX_NEXT_UP}
                </span>
              </div>
              <p className="text-xs text-text-muted mb-3">Your top priorities from "Want to Try." Drag to reorder.</p>
              <div className="space-y-2">
                {nextUpItems.map((item, i) => renderNextUpCard(item, i))}
              </div>
            </section>
          )}

          {/* Status-grouped sections */}
          {STATUS_SECTIONS.map(renderStatusSection)}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editItem ? 'Edit Item' : 'Add to Catalog'}
        maxWidth="550px"
      >
        <div className="space-y-4">
          {/* Type picker first — determines which API(s) we search */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              What is it?{' '}
              {editItem ? (
                <span className="text-xs text-text-muted">(locked when editing)</span>
              ) : typeMissing && saveAttempted ? (
                <span className="text-xs text-accent-movies">Required</span>
              ) : null}
            </label>
            <div
              className={`flex gap-2 rounded-lg transition-all ${
                typeMissing && saveAttempted ? 'ring-2 ring-accent-movies/40 p-0.5' : ''
              }`}
            >
              {MEDIA_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => !editItem && setFormData({ ...formData, type: t.value })}
                  disabled={!!editItem}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    formData.type === t.value
                      ? 'border-transparent'
                      : 'bg-bg-tertiary border-border text-text-muted hover:bg-bg-hover'
                  } ${editItem ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                  style={formData.type === t.value ? {
                    backgroundColor: `color-mix(in srgb, ${t.color} 20%, transparent)`,
                    color: t.color,
                  } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title: disabled until type chosen in add mode, plain input in edit mode */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Title *</label>
            {editItem ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Title"
                className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
              />
            ) : !formData.type ? (
              <div className="w-full bg-bg-tertiary/50 border border-dashed border-border rounded-lg px-4 py-3 text-sm text-text-muted flex items-center gap-2">
                <Sparkles size={14} />
                Pick a type above to search for a match.
              </div>
            ) : (
              <MediaPickerInput
                value={formData.title}
                onChange={(v) => setFormData({ ...formData, title: v })}
                onPick={(result) => {
                  if (result.kind === 'text') {
                    setFormData({ ...formData, title: result.title })
                  } else {
                    setFormData({
                      ...formData,
                      title: result.title,
                      creator: result.creator || formData.creator,
                      year: result.year || formData.year,
                      coverUrl: result.coverUrl || formData.coverUrl,
                    })
                  }
                }}
                placeholder={`Search ${formData.type === 'music' ? 'Spotify' : formData.type === 'book' ? 'books' : formData.type === 'tv' ? 'TV shows' : 'movies'}...`}
                preferredTypes={TYPE_TO_SEARCH_TYPES[formData.type] || ['movie']}
                autoFocus
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Creator</label>
            <input
              type="text"
              value={formData.creator}
              onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
              placeholder="Artist, director, author, etc."
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Genre</label>
            <input
              type="text"
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              placeholder="e.g. Indie Rock, Sci-Fi, Drama..."
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Rating</label>
            <StarRating
              rating={formData.rating}
              onChange={(r) => setFormData({ ...formData, rating: r })}
              size={28}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Review</label>
            <textarea
              value={formData.review}
              onChange={(e) => setFormData({ ...formData, review: e.target.value })}
              placeholder="Your thoughts..."
              rows={3}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors resize-none"
            />
          </div>

          {editItem && formData.title && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Find It</label>
              <ExternalLinks type={formData.type} title={formData.title} creator={formData.creator} />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {editItem && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-accent-movies hover:bg-accent-movies/10 transition-colors"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.title.trim() || (!editItem && !formData.type)}
              className="px-6 py-2.5 rounded-lg text-sm font-medium bg-accent-primary hover:bg-accent-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editItem ? 'Save Changes' : 'Add to Catalog'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
