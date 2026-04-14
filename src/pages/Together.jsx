import { useState } from 'react'
import { HeartHandshake, Plus, Music, Film, Tv, BookOpen, Send, MessageCircle, Clock, Check, Play, X } from 'lucide-react'
import { useTogether } from '../hooks/useTogether'
import { useFriends } from '../hooks/useFriends'
import { useCatalog } from '../hooks/useCatalog'
import Modal from '../components/common/Modal'
import CoverArt from '../components/common/CoverArt'
import { getMediaColor, MEDIA_TYPES } from '../utils/filterUtils'
import { formatDate } from '../utils/dateUtils'

const STATUS_STYLES = {
  proposed: { label: 'Proposed', color: 'var(--color-accent-primary)', icon: Clock },
  accepted: { label: 'Accepted', color: 'var(--color-accent-tv)', icon: Check },
  'in-progress': { label: 'In Progress', color: 'var(--color-accent-books)', icon: Play },
  completed: { label: 'Completed', color: 'var(--color-text-muted)', icon: Check },
}

export default function Together() {
  const { sessions, createSession, updateStatus, addNote, deleteSession } = useTogether()
  const { following } = useFriends()
  const { items: catalogItems } = useCatalog()
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [noteText, setNoteText] = useState('')

  // Create form state
  const [form, setForm] = useState({ mediaTitle: '', mediaCreator: '', mediaType: 'movie', inviteeId: '' })

  const handleCreate = () => {
    if (!form.mediaTitle.trim() || !form.inviteeId) return
    const invitee = following.find((f) => f.userId === form.inviteeId)
    if (!invitee) return
    createSession({
      mediaTitle: form.mediaTitle,
      mediaCreator: form.mediaCreator,
      mediaType: form.mediaType,
      invitee,
    })
    setForm({ mediaTitle: '', mediaCreator: '', mediaType: 'movie', inviteeId: '' })
    setShowCreate(false)
  }

  const handleAddNote = (sessionId) => {
    if (!noteText.trim()) return
    addNote(sessionId, noteText)
    setNoteText('')
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Group Chat</h1>
          <p className="text-text-secondary">
            Start a thread around something you're watching, reading, or listening to. Rope in a friend. No pressure, just vibes.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0"
        >
          <Plus size={16} />
          New Session
        </button>
      </div>

      {/* Sessions */}
      {sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isExpanded = expandedId === session.id
            const color = getMediaColor(session.mediaType)
            const statusInfo = STATUS_STYLES[session.status] || STATUS_STYLES.proposed
            const StatusIcon = statusInfo.icon

            return (
              <div key={session.id} className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
                {/* Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-bg-hover/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                >
                  <div className="flex items-center gap-4">
                    <CoverArt title={session.mediaTitle} type={session.mediaType} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary">{session.mediaTitle}</h3>
                      <p className="text-sm text-text-secondary">{session.mediaCreator}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}>
                          <StatusIcon size={10} className="inline mr-1" />
                          {statusInfo.label}
                        </span>
                        <span className="text-xs text-text-muted">
                          with {session.participants.filter((p) => p.userId !== session.creatorId).map((p) => p.displayName).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                    {/* Status controls */}
                    <div className="flex gap-2">
                      {['proposed', 'accepted', 'in-progress', 'completed'].map((status) => {
                        const info = STATUS_STYLES[status]
                        const isActive = session.status === status
                        return (
                          <button
                            key={status}
                            onClick={() => updateStatus(session.id, status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isActive ? 'text-white' : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'
                            }`}
                            style={isActive ? { backgroundColor: info.color } : {}}
                          >
                            {info.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Notes thread */}
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
                        <MessageCircle size={14} />
                        Notes & Reactions ({session.notes.length})
                      </h4>
                      {session.notes.length > 0 && (
                        <div className="space-y-2 mb-3 max-h-[200px] overflow-y-auto">
                          {session.notes.map((note) => (
                            <div key={note.id} className="p-2.5 bg-bg-tertiary rounded-lg">
                              <p className="text-sm text-text-primary">{note.text}</p>
                              <p className="text-xs text-text-muted mt-1">{note.displayName} · {formatDate(note.createdAt)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={expandedId === session.id ? noteText : ''}
                          onChange={(e) => setNoteText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddNote(session.id)}
                          placeholder="Add a note or reaction..."
                          className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
                        />
                        <button
                          onClick={() => handleAddNote(session.id)}
                          className="p-2 bg-accent-primary/10 text-accent-primary rounded-lg hover:bg-accent-primary/20 transition-colors"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="text-xs text-text-muted hover:text-accent-movies transition-colors"
                    >
                      Delete session
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-bg-secondary border border-border rounded-2xl">
          <HeartHandshake size={48} className="mx-auto text-text-muted/30 mb-4" />
          <h3 className="text-lg font-medium text-text-secondary mb-2">Crickets in here</h3>
          <p className="text-text-muted text-sm mb-4 max-w-md mx-auto">
            Nobody's watching, reading, or listening to anything together yet. Be the friend who makes the first move.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Start Something
          </button>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Start a Group Chat" maxWidth="500px">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">What are you consuming?</label>
            <input
              type="text"
              value={form.mediaTitle}
              onChange={(e) => setForm({ ...form, mediaTitle: e.target.value })}
              placeholder="e.g. Dune, OK Computer, Station Eleven..."
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Creator</label>
            <input
              type="text"
              value={form.mediaCreator}
              onChange={(e) => setForm({ ...form, mediaCreator: e.target.value })}
              placeholder="Director, artist, author..."
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Type</label>
            <div className="flex gap-2">
              {MEDIA_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm({ ...form, mediaType: t.value })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    form.mediaType === t.value
                      ? 'border-transparent'
                      : 'bg-bg-tertiary border-border text-text-muted hover:bg-bg-hover'
                  }`}
                  style={form.mediaType === t.value ? {
                    backgroundColor: `color-mix(in srgb, ${t.color} 20%, transparent)`,
                    color: t.color,
                  } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Invite a friend</label>
            {following.length > 0 ? (
              <div className="space-y-2">
                {following.map((friend) => (
                  <button
                    key={friend.userId}
                    onClick={() => setForm({ ...form, inviteeId: friend.userId })}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      form.inviteeId === friend.userId
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-border bg-bg-tertiary hover:bg-bg-hover'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary text-sm font-bold">
                      {friend.displayName[0]}
                    </div>
                    <span className="text-sm text-text-primary">{friend.displayName}</span>
                    {form.inviteeId === friend.userId && <Check size={16} className="ml-auto text-accent-primary" />}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted bg-bg-tertiary rounded-lg p-3">
                Follow some friends first! Head to the Friends page to find people.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.mediaTitle.trim() || !form.inviteeId}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-primary hover:bg-accent-hover text-white transition-colors disabled:opacity-50"
            >
              Create Session
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
