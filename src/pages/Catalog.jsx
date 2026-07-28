import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, LayoutGrid, List, Music, Film, Tv, BookOpen, Trash2, Pin, PinOff, GripVertical, ArrowUp, ArrowDown, Search, SlidersHorizontal, Target, Library, Play, Check, X, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { useCatalog } from '../hooks/useCatalog'
import { useNextUp } from '../hooks/useNextUp'
import FilterBar from '../components/common/FilterBar'
import StarRating from '../components/common/StarRating'
import CoverArt from '../components/common/CoverArt'
import Modal from '../components/common/Modal'
import ExternalLinks from '../components/common/ExternalLinks'
import MediaPickerInput from '../components/common/MediaPickerInput'
import ItemLightbox from '../components/ItemLightbox'
import Celebration from '../components/common/Celebration'
import CatalogInsights from '../components/CatalogInsights'
import QuickAdd from '../components/QuickAdd'
import VibeTagPicker, { VibeTagList } from '../components/common/VibeTags'
import { filterCatalog, sortCatalog, MEDIA_TYPES, STATUS_OPTIONS, getMediaColor } from '../utils/filterUtils'
import { formatRating } from '../utils/ratingUtils'

const EMPTY_ITEM = { title: '', creator: '', type: null, genre: '', status: 'want', rating: 0, review: '', coverUrl: '', year: '', hidden: false, vibeTags: [] }

const TYPE_TO_SEARCH_TYPES = {
  music: ['music'],
  movie: ['movie'],
  tv: ['tv'],
  book: ['book'],
}

// Ordered sections rendered when no status filter is active
// Statuses have their OWN palette (coral/teal/gold), deliberately distinct
// from the media-type accents so a finished movie never dresses like a book.
const STATUS_SECTIONS = [
  { key: 'want',     label: 'Want to Try',  icon: Library, color: 'var(--color-status-want)' },
  { key: 'watching', label: 'In Progress',  icon: Play,    color: 'var(--color-status-progress)' },
  { key: 'finished', label: 'Finished',     icon: Check,   color: 'var(--color-status-finished)' },
  { key: 'dropped',  label: 'Dropped',      icon: X,       color: 'var(--color-text-muted)' },
]

export default function Catalog() {
  const { items, addItem, updateItem, deleteItem } = useCatalog()
  const { itemIds: nextUpIds, addToNextUp, removeFromNextUp, reorder: reorderNextUp, isInNextUp, isFull: nextUpFull, MAX_NEXT_UP } = useNextUp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState({})
  const [sortBy, setSortBy] = useState('dateAdded')
  const [viewMode, setViewMode] = useState('grid')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [formData, setFormData] = useState(EMPTY_ITEM)
  const [lightboxItem, setLightboxItem] = useState(null)
  const [collapsedSections, setCollapsedSections] = useState(() => new Set())

  const toggleSection = (key) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const jumpToSection = (key) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    requestAnimationFrame(() => {
      document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [celebrating, setCelebrating] = useState(null)

  // Marking something Finished is the payoff of the whole app — set the
  // completion date, drop it from Next Up, and fire the celebration moment.
  const handleFinish = (item) => {
    updateItem(item.id, { status: 'finished', dateConsumed: new Date().toISOString() })
    if (isInNextUp(item.id)) removeFromNextUp(item.id)
    setCelebrating(item)
  }

  // The lightbox holds a snapshot from when it opened; re-derive from the live
  // catalog so status changes made inside it show up immediately.
  const liveLightboxItem = lightboxItem
    ? items.find((i) => i.id === lightboxItem.id) || lightboxItem
    : null

  // Auto-open the Add modal when ?add=1 appears — on mount AND while already
  // on this page (the nav + button links here; with mount-only deps it did
  // nothing if you were already on the Log).
  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setFormData(EMPTY_ITEM)
      setEditItem(null)
      setSaveAttempted(false)
      setShowAddModal(true)
      // Clean up so refreshes don't re-open
      const next = new URLSearchParams(searchParams)
      next.delete('add')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ?edit=<id> — how the Dashboard lightbox hands an item over for a full
  // edit. Waits for the catalog to load before giving up on the id.
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId) return
    const target = items.find((i) => i.id === editId)
    if (!target) return
    setFormData(target)
    setEditItem(target)
    setSaveAttempted(false)
    setShowAddModal(true)
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, items])

  const filtered = sortCatalog(filterCatalog(items, filters), sortBy)
  // A type-only filter (from the top tab strip) should still show the status
  // groupings — only "non-type" filters collapse the view to flat.
  const hasActiveFilters = !!(filters.status && filters.status !== 'all') ||
    !!(filters.search && filters.search.trim()) ||
    !!(filters.genre && filters.genre.trim()) ||
    !!(filters.vibe && filters.vibe !== 'all') ||
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
    setLightboxItem(null)
    setFormData(item)
    setEditItem(item)
    setSaveAttempted(false)
    setShowAddModal(true)
  }

  const openLightbox = (item) => {
    setLightboxItem(item)
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
    try { e.dataTransfer.setData('text/plain', String(i)) } catch { /* not supported */ }
  }
  const onDragOver = () => (e) => {
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
  // Dense, cover-first tile: a dozen visible at once, tap for the full
  // lightbox (status changes, rating, delete all live there).
  const renderCatalogItem = (item) => {
    const showPin = item.status === 'want' && !isInNextUp(item.id)
    const pinned = isInNextUp(item.id)
    const section = STATUS_SECTIONS.find((s) => s.key === item.status)
    return (
      <div key={item.id} className="group cursor-pointer w-28 shrink-0" onClick={() => openLightbox(item)}>
        <div className="relative w-28 mx-auto">
          <CoverArt title={item.title} type={item.type} creator={item.creator} coverUrl={item.coverUrl} size="lg" />
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
              className={`absolute top-1.5 right-1.5 p-1.5 rounded-lg transition-all ${
                pinned
                  ? 'bg-accent-primary text-white shadow-md'
                  : 'bg-bg-primary/80 text-text-muted opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-30'
              }`}
            >
              {pinned ? <PinOff size={13} /> : <Pin size={13} />}
            </button>
          )}
        </div>
        <p className="text-xs font-medium text-text-primary truncate mt-1.5 text-center">{item.title}</p>
        <div className="flex items-center justify-center gap-1 mt-0.5 min-h-[14px]">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: section?.color || 'var(--color-text-muted)' }} aria-hidden="true" />
          {item.rating > 0 ? (
            <span className="text-[10px] font-semibold text-amber-500">★ {formatRating(item.rating)}</span>
          ) : (
            <span className="text-[10px] text-text-muted truncate">{section?.label || ''}</span>
          )}
        </div>
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
    const collapsed = collapsedSections.has(section.key)
    return (
      <section key={section.key} id={`section-${section.key}`} className="ink-card bg-bg-secondary rounded-2xl p-5 mb-6 scroll-mt-4">
        <button
          onClick={() => toggleSection(section.key)}
          className="w-full flex items-center gap-2 mb-3 text-left group/section"
          title={collapsed ? `Show ${section.label}` : `Hide ${section.label} for now`}
        >
          <Icon size={18} style={{ color: section.color }} />
          <h2 className="text-lg font-semibold text-text-primary">{section.label}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${section.color} 15%, transparent)`, color: section.color }}>
            {sectionItems.length}
          </span>
          <span className="flex-1" />
          <span className="p-1 rounded-lg text-text-muted group-hover/section:text-text-secondary group-hover/section:bg-bg-hover transition-colors">
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
        </button>
        {!collapsed && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {sectionItems.map(renderCatalogItem)}
          </div>
        )}
      </section>
    )
  }

  const typeMissing = !editItem && !formData.type

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Log</h1>
          <p className="text-text-secondary text-sm mt-1">{items.length} items in your library</p>
        </div>
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="p-2 bg-bg-secondary border border-border rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0"
          title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
        >
          {viewMode === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
        </button>
      </div>

      {/* Primary action: Quick Add — straight to catalog */}
      <div className="mb-3">
        <QuickAdd addItem={addItem} />
      </div>

      {/* Secondary: detailed add (rating, review, status, genre) — ink pill */}
      <button
        onClick={openAdd}
        className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.99] shadow-md hover:opacity-90"
        style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-nav-text)' }}
      >
        <Plus size={15} />
        Add with rating &amp; review
      </button>

      {/* Just added — the thing you entered ten seconds ago, visibly here */}
      {!hasActiveFilters && items.length > 0 && (
        <div className="ink-card bg-bg-secondary rounded-2xl p-5 mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[2px] text-text-muted mb-2">Just added</p>
          <div className="flex gap-3">
            {[...items]
              .sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0))
              .slice(0, 4)
              .map((it) => (
                <button key={it.id} onClick={() => openLightbox(it)} className="shrink-0 w-16 text-left" title={it.title}>
                  <CoverArt title={it.title} type={it.type} creator={it.creator} coverUrl={it.coverUrl} size="radar" />
                  <p className="text-[10px] text-text-muted truncate mt-1">{it.title}</p>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Status jump links — anchor straight to the shelf you want */}
      {!hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {STATUS_SECTIONS.map((s) => {
            const count = items.filter((i) => i.status === s.key).length
            if (count === 0) return null
            return (
              <button
                key={s.key}
                onClick={() => jumpToSection(s.key)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border-[1.5px] transition-all hover:opacity-90"
                style={{
                  color: s.color,
                  backgroundColor: `color-mix(in srgb, ${s.color} 12%, var(--color-bg-secondary))`,
                  borderColor: `color-mix(in srgb, ${s.color} 40%, transparent)`,
                }}
              >
                {s.label}
                <span className="opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Search + filters — always visible */}
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
          <div className="ink-card bg-bg-secondary rounded-2xl p-5">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-5 justify-items-center">
              {filtered.map(renderCatalogItem)}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const color = getMediaColor(item.type)
              return (
                <div
                  key={item.id}
                  onClick={() => openLightbox(item)}
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
                    <VibeTagList tags={item.vibeTags} size="xs" className="mt-1" />
                  </div>
                  {item.rating > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StarRating rating={item.rating} readonly size={14} />
                      <span className="text-xs font-semibold text-amber-500">{formatRating(item.rating)}</span>
                    </div>
                  )}
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
            <section className="ink-card bg-bg-secondary rounded-2xl p-5 mb-6">
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

      {/* Item detail + media-info lightbox. Feed it the live item so status
          changes made inside it reflect immediately. */}
      <ItemLightbox
        item={liveLightboxItem}
        isOpen={!!liveLightboxItem}
        onClose={() => setLightboxItem(null)}
        onEdit={openEdit}
        onUpdate={updateItem}
        onFinish={handleFinish}
        onDelete={(item) => {
          if (isInNextUp(item.id)) removeFromNextUp(item.id)
          deleteItem(item.id)
          setLightboxItem(null)
        }}
        addItem={addItem}
      />

      {/* Celebration when something is marked Finished.
          key remounts it per item so each finish starts with a fresh rating prompt. */}
      <Celebration
        key={celebrating?.id || 'none'}
        item={celebrating}
        onRate={(rating) => celebrating && updateItem(celebrating.id, { rating })}
        onReview={(review) => celebrating && updateItem(celebrating.id, { review })}
        onVibes={(vibeTags) => celebrating && updateItem(celebrating.id, { vibeTags })}
        onClose={() => setCelebrating(null)}
      />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editItem ? 'Edit Item' : 'Add to your Log'}
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
                  className={`flex-1 py-2 rounded-lg text-xs border-[1.5px] transition-all ${
                    formData.type === t.value ? 'font-bold' : 'font-medium hover:opacity-90'
                  } ${editItem ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                  style={{
                    color: t.color,
                    backgroundColor: `color-mix(in srgb, ${t.color} ${formData.type === t.value ? 22 : 8}%, var(--color-bg-secondary))`,
                    borderColor: formData.type === t.value ? `color-mix(in srgb, ${t.color} 55%, transparent)` : 'transparent',
                  }}
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
                <Search size={14} />
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
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Rating
              <span className="ml-2 text-xs text-text-muted font-normal">Half stars count. Tap the left side of a star.</span>
            </label>
            <div className="flex items-center gap-3">
              <StarRating
                rating={formData.rating}
                // Rating something means you finished it — reflect that in the
                // status right away (still overridable via the Status select).
                onChange={(r) => setFormData({ ...formData, rating: r, status: r > 0 ? 'finished' : formData.status })}
                size={28}
              />
              {formData.rating > 0 && (
                <span className="text-sm font-semibold text-amber-500">{formatRating(formData.rating)}</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Vibe</label>
            <VibeTagPicker
              tags={formData.vibeTags}
              onChange={(vibeTags) => setFormData({ ...formData, vibeTags })}
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

          {/* Privacy: keep it in your catalog, off your public profile */}
          <button
            type="button"
            onClick={() => setFormData({ ...formData, hidden: !formData.hidden })}
            className="w-full flex items-start gap-3 p-3 rounded-xl bg-bg-tertiary/60 border border-border text-left hover:bg-bg-hover/50 transition-colors"
            aria-pressed={!!formData.hidden}
          >
            {formData.hidden ? (
              <EyeOff size={16} className="text-accent-primary mt-0.5 shrink-0" />
            ) : (
              <Eye size={16} className="text-text-muted mt-0.5 shrink-0" />
            )}
            <span className="flex-1">
              <span className="block text-sm font-medium text-text-primary">Hide from profile</span>
              <span className="block text-xs text-text-muted mt-0.5">
                Stays in your log and counts, but friends and profile visitors never see it.
              </span>
            </span>
            <span
              className={`shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors relative ${formData.hidden ? 'bg-accent-primary' : 'bg-bg-secondary border border-border'}`}
              aria-hidden="true"
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${formData.hidden ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
          </button>

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
              {editItem ? 'Save Changes' : 'Add to your Log'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
