import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

export function useScratchpad() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])

  const storageKey = user ? `cc_scratchpad_${user.uid}` : null

  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      setNotes(JSON.parse(saved))
    }
  }, [storageKey])

  const save = (updated) => {
    setNotes(updated)
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(updated))
    }
  }

  const addNote = (text) => {
    if (!text.trim()) return
    const note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    }
    save([note, ...notes])
    return note
  }

  const deleteNote = (id) => {
    save(notes.filter((n) => n.id !== id))
  }

  return { notes, addNote, deleteNote }
}
