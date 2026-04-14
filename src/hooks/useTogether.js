import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

export function useTogether() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])

  const storageKey = user ? `cc_together_${user.uid}` : null

  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved) setSessions(JSON.parse(saved))
  }, [storageKey])

  const save = (updated) => {
    setSessions(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const createSession = ({ mediaTitle, mediaCreator, mediaType, invitee }) => {
    const session = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mediaTitle,
      mediaCreator,
      mediaType,
      creatorId: user.uid,
      creatorName: user.displayName,
      participants: [
        { userId: user.uid, displayName: user.displayName, status: 'accepted' },
        { userId: invitee.userId, displayName: invitee.displayName, status: 'pending' },
      ],
      status: 'proposed',
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    save([session, ...sessions])
    return session
  }

  const updateStatus = (sessionId, status) => {
    save(
      sessions.map((s) =>
        s.id === sessionId ? { ...s, status, updatedAt: new Date().toISOString() } : s
      )
    )
  }

  const addNote = (sessionId, text) => {
    save(
      sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              notes: [
                ...s.notes,
                {
                  id: `note-${Date.now()}`,
                  userId: user.uid,
                  displayName: user.displayName,
                  text,
                  createdAt: new Date().toISOString(),
                },
              ],
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    )
  }

  const deleteSession = (sessionId) => {
    save(sessions.filter((s) => s.id !== sessionId))
  }

  return { sessions, createSession, updateStatus, addNote, deleteSession }
}
