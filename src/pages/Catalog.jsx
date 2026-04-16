import { useState } from 'react'
import { Plus, LayoutGrid, List, Music, Film, Tv, BookOpen, Pencil, Trash2 } from 'lucide-react'
import { useCatalog } from '../hooks/useCatalog'
import MediaCard from '../components/common/MediaCard'
import FilterBar from '../components/common/FilterBar'
import StarRating from '../components/common/StarRating'
import Modal from '../components/common/Modal'
import ExternalLinks from '../components/common/ExternalLinks'
import MediaPickerInput from '../components/common/MediaPickerInput'
import { filterCatalog, sortCatalog, MEDIA_TYPES, STATUS_OPTIONS, getMediaColor } from '../utils/filterUtils'

const EMPTY_ITEM = { title: '', creator: '', type: 'music', genre: '', status: 'want', rating: 0, review: '', coverUrl: '', year: '' }

// Map app type to the preferredTypes used by media search
const TYPE_TO_SEARCH_TYPES = {
  music: ['music'],
  movie: ['movie'],
  tv: ['tv'],
  book: ['book'],
}

export default function Catalog() {
  const { items, addItem, updateItem, deleteItem } = useCatalog()
  const [filters, setFilters] = useState({})
  const [sortBy, setSortBy] = useState('dateAdded')
  const [viewMode, setViewMode] = useState('grid')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [formData, setFormData] = useState(EMPTY_ITEM)

  const filtered = sortCatalog(filterCatalog(items, filters), sortBy)

  const openAdd = () => {
    setFormData(EMPTY_ITEM)
    setEditItem(null)
    setShowAddModal(true)
  }

  const openEdit = (item) => {
    setFormData(item)
    setEditItem(item)
    setShowAddModal(true)
  }

  const handleSave = () => {
    if (!formData.title.trim()) return
    if (editItem) {
      updateItem(editItem.id, formData)
    } else {
      addItem(formData)
    }
    setShowAddModal(false)
  }

  const handleDelete = () => {
    if (editItem) {
      deleteItem(editItem.id)
      setShowAddModal(false)
    }
  }

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
            {items.length === 0 ? "Nothing here but potential" : 'No matches found'}
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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <MediaCard key={item.id} item={item} onClick={openEdit} />
          ))}
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
              What is it? {editItem && <span className="text-xs text-text-muted">(locked when editing)</span>}
            </label>
            <div className="flex gap-2">
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

          {/* Smart search (add mode) or plain input (edit mode) */}
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
                      // Keep user's already-chosen type — don't override from result
                    })
                  }
                }}
                placeholder={`Search ${formData.type === 'music' ? 'Spotify' : formData.type === 'book' ? 'books' : formData.type === 'tv' ? 'TV shows' : 'movies'}...`}
                preferredTypes={TYPE_TO_SEARCH_TYPES[formData.type] || ['movie']}
              />
            )}
          </div>

          {/* Creator (auto-filled from picked result, but editable) */}
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

          {/* Status */}
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
              disabled={!formData.title.trim()}
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
