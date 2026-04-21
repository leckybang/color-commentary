import { useState, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Save, Headphones, Eye, BookOpen, Sparkles, MessageCircle, ArrowUpRight, X, Wand2, Music, Film, Tv } from 'lucide-react'
import { useWeeklyDumps } from '../hooks/useWeeklyDumps'
import { useCatalog } from '../hooks/useCatalog'
import { useScratchpad } from '../hooks/useScratchpad'
import { getWeekId, getWeekRange, formatWeekRange } from '../utils/dateUtils'
import { formatDate } from '../utils/dateUtils'
import { getMediaColor } from '../utils/filterUtils'
import MediaSearchInput from '../components/common/MediaSearchInput'
import ParseWithAIButton from '../components/weekly/ParseWithAIButton'
import AIParseModal from '../components/weekly/AIParseModal'

const NOTE_TYPE_ICONS = { music: Music, movie: Film, tv: Tv, book: BookOpen }
// Route a scratchpad note's type to the correct Liner Notes section
const TYPE_TO_SECTION = { music: 'listening', movie: 'watching', tv: 'watching', book: 'reading' }

const SECTIONS = [
  { key: 'listening', label: 'Listening To', icon: Headphones, color: 'var(--color-accent-music)', placeholder: 'Search Spotify for an album, artist, or track...', preferredTypes: ['music'] },
  { key: 'watching', label: 'Watching', icon: Eye, color: 'var(--color-accent-movies)', placeholder: 'Search for a movie or show...', preferredTypes: ['movie', 'tv'] },
  { key: 'reading', label: 'Reading', icon: BookOpen, color: 'var(--color-accent-books)', placeholder: 'Search for a book...', preferredTypes: ['book'] },
  { key: 'discovered', label: 'Discovered', icon: Sparkles, color: 'var(--color-accent-primary)', placeholder: 'Anything new — we\'ll search everywhere...', preferredTypes: ['music', 'movie', 'tv', 'book'] },
]

function tagKey(tag) {
  if (typeof tag === 'string') return `text:${tag.toLowerCase()}`
  if (tag.provider && tag.externalId) return `${tag.provider}:${tag.externalId}`
  return `text:${(tag.title || '').toLowerCase()}`
}

export default function Weekly() {
  const { dumps, saveDump, getStreak } = useWeeklyDumps()
  const { addItem } = useCatalog()
  const { notes: scratchpadNotes, deleteNote } = useScratchpad()
  const [weekOffset, setWeekOffset] = useState(0)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiModalText, setAiModalText] = useState('')
  const [aiModalSourceNoteId, setAiModalSourceNoteId] = useState(null)

  const openAIModal = (text, sourceNoteId = null) => {
    setAiModalText(text || '')
    setAiModalSourceNoteId(sourceNoteId)
    setAiModalOpen(true)
  }

  const currentDate = new Date()
  currentDate.setDate(currentDate.getDate() + weekOffset * 7)
  const weekId = getWeekId(currentDate)
  const { start, end } = getWeekRange(currentDate)

  const existingDump = dumps.find((d) => d.weekId === weekId)

  const [form, setForm] = useState({
    listening: [],
    watching: [],
    reading: [],
    discovered: [],
    notes: '',
  })

  useEffect(() => {
    if (existingDump) {
      setForm({
        listening: existingDump.listening || [],
        watching: existingDump.watching || [],
        reading: existingDump.reading || [],
        discovered: existingDump.discovered || [],
        notes: existingDump.notes || '',
      })
    } else {
      setForm({ listening: [], watching: [], reading: [], discovered: [], notes: '' })
    }
  }, [weekId])

  const handleSave = () => {
    saveDump({ weekId, ...form })
  }

  const addTagToSection = (section, value) => {
    const current = form[section] || []
    const newKey = tagKey(value)
    if (current.some((t) => tagKey(t) === newKey)) return
    const newForm = { ...form, [section]: [...current, value] }
    setForm(newForm)
    saveDump({ weekId, ...newForm })
  }

  const removeTagFromSection = (section, value) => {
    const removeKey = tagKey(value)
    const newForm = { ...form, [section]: form[section].filter((v) => tagKey(v) !== removeKey) }
    setForm(newForm)
    saveDump({ weekId, ...newForm })
  }

  // Handle batch of AI-parsed items, optionally also adding to catalog
  const handleAIConfirm = (items) => {
    const next = { ...form }
    for (const item of items) {
      const section = item.section || 'discovered'
      const tag = {
        kind: 'media',
        title: item.title,
        creator: item.creator || '',
        year: item.year ? String(item.year) : '',
        type: item.type,
        provider: 'ai',
        externalId: `${item.title}-${item.creator || ''}`.toLowerCase(),
      }
      const current = next[section] || []
      const key = tagKey(tag)
      if (!current.some((t) => tagKey(t) === key)) {
        next[section] = [...current, tag]
      }
      // Also add to catalog if user opted in
      if (item.addToCatalog) {
        addItem({
          title: item.title,
          creator: item.creator || '',
          type: item.type,
          rating: item.rating || 0,
          review: item.notes || '',
          status: item.rating ? 'finished' : 'want',
        })
      }
    }
    setForm(next)
    saveDump({ weekId, ...next })
    // If this was from a scratchpad note, delete it
    if (aiModalSourceNoteId) {
      deleteNote(aiModalSourceNoteId)
    }
    setAiModalOpen(false)
    setAiModalText('')
    setAiModalSourceNoteId(null)
  }

  const isCurrentWeek = weekOffset === 0
  const streak = getStreak()
  const totalItems = form.listening.length + form.watching.length + form.reading.length + form.discovered.length
  const hasChanges = JSON.stringify(form) !== JSON.stringify({
    listening: existingDump?.listening || [],
    watching: existingDump?.watching || [],
    reading: existingDump?.reading || [],
    discovered: existingDump?.discovered || [],
    notes: existingDump?.notes || '',
  })

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">The Liner Notes</h1>
          <p className="text-text-secondary text-sm">Your weekly brain dump on what's in rotation. Hot takes welcome.</p>
        </div>
        {streak > 0 && (
          <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-accent-primary">{streak}</p>
            <p className="text-xs text-accent-primary/80">week streak</p>
          </div>
        )}
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between bg-bg-secondary border border-border rounded-xl p-4 mb-6">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">{formatWeekRange(start, end)}</p>
          <p className="text-xs text-text-muted">{isCurrentWeek ? 'This Week' : `${Math.abs(weekOffset)} week${Math.abs(weekOffset) > 1 ? 's' : ''} ${weekOffset < 0 ? 'ago' : 'ahead'}`}</p>
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset >= 0}
          className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary transition-colors disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Media sections */}
      <div className="space-y-4">
        {SECTIONS.map(({ key, label, icon: Icon, color, placeholder, preferredTypes }) => (
          <div key={key} className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={18} style={{ color }} />
              <h3 className="font-medium text-text-primary">{label}</h3>
              {form[key].length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                  {form[key].length}
                </span>
              )}
            </div>
            <MediaSearchInput
              tags={form[key]}
              onAdd={(val) => addTagToSection(key, val)}
              onRemove={(val) => removeTagFromSection(key, val)}
              placeholder={placeholder}
              color={color}
              preferredTypes={preferredTypes}
            />
          </div>
        ))}

        {/* Scratchpad reminders */}
        {scratchpadNotes.length > 0 && (
          <div className="bg-bg-secondary border border-accent-primary/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-accent-primary" />
                <h3 className="font-medium text-text-primary">From Your Scratchpad</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary">{scratchpadNotes.length}</span>
              </div>
              {scratchpadNotes.length >= 2 && (
                <button
                  onClick={() => openAIModal(scratchpadNotes.map(n => n.text).join('\n\n'))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary hover:bg-accent-hover text-white transition-colors"
                >
                  <Wand2 size={13} />
                  Add all with AI
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted mb-3">Things people told you about. Tap ↗ to add to the right section, or ✨ to parse with AI.</p>
            <div className="space-y-2">
              {scratchpadNotes.map((note) => {
                const TypeIcon = note.type ? NOTE_TYPE_ICONS[note.type] : null
                const typeColor = note.type ? getMediaColor(note.type) : null
                const targetSection = note.type ? TYPE_TO_SECTION[note.type] : 'discovered'
                return (
                  <div key={note.id} className="flex items-center gap-2 p-2.5 bg-bg-tertiary rounded-lg group">
                    {note.coverUrl ? (
                      <img
                        src={note.coverUrl}
                        alt=""
                        className="w-8 h-10 rounded object-cover shrink-0"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : TypeIcon ? (
                      <div
                        className="w-8 h-10 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `color-mix(in srgb, ${typeColor} 15%, transparent)` }}
                      >
                        <TypeIcon size={14} style={{ color: typeColor }} />
                      </div>
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{note.text}</p>
                      {(note.creator || note.createdAt) && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {note.creator && <span>{note.creator}{note.year ? ` · ${note.year}` : ''} · </span>}
                          {formatDate(note.createdAt)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => openAIModal(note.text, note.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-accent-primary hover:bg-accent-primary/10 transition-colors shrink-0"
                      title="Parse with AI and add to a section"
                    >
                      <Sparkles size={13} />
                      <span className="text-xs font-medium hidden sm:inline">Add with AI</span>
                    </button>
                    <button
                      onClick={() => {
                        const tag = note.type
                          ? {
                              kind: 'media',
                              title: note.text,
                              creator: note.creator || '',
                              year: note.year || '',
                              type: note.type,
                              coverUrl: note.coverUrl || '',
                              provider: 'scratchpad',
                              externalId: note.id,
                            }
                          : { kind: 'text', title: note.text }
                        addTagToSection(targetSection, tag)
                        deleteNote(note.id)
                      }}
                      className="p-1 rounded text-text-muted hover:text-accent-primary transition-colors shrink-0"
                      title={`Add to ${targetSection}`}
                    >
                      <ArrowUpRight size={14} />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1 rounded text-text-muted hover:text-accent-movies transition-colors shrink-0"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-text-primary">Notes & Thoughts</h3>
          </div>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Write freeform about your week. Mention titles, rate things ('Dune was a 5/5'), drop hot takes. Then hit 'Add with AI' to turn it into structured items."
            rows={5}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors resize-none text-sm mb-3"
          />
          <div className="flex justify-end">
            <ParseWithAIButton onClick={() => openAIModal(form.notes)} hasText={!!form.notes.trim()} />
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-20 md:bottom-4 mt-6">
        <div className="bg-bg-secondary/95 backdrop-blur border border-border rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {totalItems} items logged {hasChanges && '(unsaved changes)'}
          </p>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            Save Week
          </button>
        </div>
      </div>

      {/* AI Parse Modal */}
      <AIParseModal
        isOpen={aiModalOpen}
        onClose={() => { setAiModalOpen(false); setAiModalSourceNoteId(null) }}
        initialText={aiModalText}
        onConfirm={handleAIConfirm}
      />
    </div>
  )
}
