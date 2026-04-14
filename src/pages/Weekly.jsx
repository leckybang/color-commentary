import { useState, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Save, Headphones, Eye, BookOpen, Sparkles, MessageCircle, ArrowUpRight, X } from 'lucide-react'
import { useWeeklyDumps } from '../hooks/useWeeklyDumps'
import { useCatalog } from '../hooks/useCatalog'
import { useScratchpad } from '../hooks/useScratchpad'
import { getWeekId, getWeekRange, formatWeekRange } from '../utils/dateUtils'
import { formatDate } from '../utils/dateUtils'
import TagInput from '../components/common/TagInput'

const SECTIONS = [
  { key: 'listening', label: 'Listening To', icon: Headphones, color: 'var(--color-accent-music)', placeholder: 'Albums, songs, playlists...' },
  { key: 'watching', label: 'Watching', icon: Eye, color: 'var(--color-accent-movies)', placeholder: 'Movies, shows, videos...' },
  { key: 'reading', label: 'Reading', icon: BookOpen, color: 'var(--color-accent-books)', placeholder: 'Books, articles, comics...' },
  { key: 'discovered', label: 'Discovered', icon: Sparkles, color: 'var(--color-accent-primary)', placeholder: 'New finds, recommendations...' },
]

export default function Weekly() {
  const { dumps, saveDump, getStreak } = useWeeklyDumps()
  const { addItem } = useCatalog()
  const { notes: scratchpadNotes, deleteNote } = useScratchpad()
  const [weekOffset, setWeekOffset] = useState(0)

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
    setForm({ ...form, [section]: [...form[section], value] })
  }

  const removeTagFromSection = (section, value) => {
    setForm({ ...form, [section]: form[section].filter((v) => v !== value) })
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
        {SECTIONS.map(({ key, label, icon: Icon, color, placeholder }) => (
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
            <TagInput
              tags={form[key]}
              onAdd={(val) => addTagToSection(key, val)}
              onRemove={(val) => removeTagFromSection(key, val)}
              placeholder={placeholder}
              color={color}
            />
          </div>
        ))}

        {/* Scratchpad reminders */}
        {scratchpadNotes.length > 0 && (
          <div className="bg-bg-secondary border border-accent-primary/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={18} className="text-accent-primary" />
              <h3 className="font-medium text-text-primary">From Your Scratchpad</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary">{scratchpadNotes.length}</span>
            </div>
            <p className="text-xs text-text-muted mb-3">Things people told you about — tap to add to a section above, or dismiss.</p>
            <div className="space-y-2">
              {scratchpadNotes.map((note) => (
                <div key={note.id} className="flex items-center gap-2 p-2.5 bg-bg-tertiary rounded-lg group">
                  <p className="flex-1 text-sm text-text-primary">{note.text}</p>
                  <span className="text-xs text-text-muted shrink-0">{formatDate(note.createdAt)}</span>
                  <button
                    onClick={() => {
                      addTagToSection('discovered', note.text)
                      deleteNote(note.id)
                    }}
                    className="p-1 rounded text-accent-primary hover:bg-accent-primary/10 transition-colors shrink-0"
                    title="Add to Discovered"
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
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h3 className="font-medium text-text-primary mb-3">Notes & Thoughts</h3>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any thoughts on what you consumed this week? Hot takes? Recommendations for your future self?"
            rows={4}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors resize-none text-sm"
          />
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
    </div>
  )
}
