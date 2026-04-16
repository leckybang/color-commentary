import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase, shouldSync, isRealUuid } from '../lib/syncToSupabase'

/**
 * Scratchpad notes — syncs to Supabase's scratchpad_notes table for real users;
 * falls back to localStorage for demo/offline mode.
 * Conflict resolution: last-write-wins (no merging).
 */
export function useScratchpad() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])

  const storageKey = user ? `cc_scratchpad_${user.uid}` : null
  const canSync = shouldSync(user)

  // Load from localStorage immediately, then hydrate from Supabase
  useEffect(() => {
    if (!storageKey) return

    const saved = localStorage.getItem(storageKey)
    if (saved) setNotes(JSON.parse(saved))

    if (canSync) {
      supabase
        .from('scratchpad_notes')
        .select('id, text, created_at')
        .eq('user_id', user.uid)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Scratchpad fetch failed:', error.message)
            return
          }
          if (data) {
            const mapped = data.map((n) => ({
              id: n.id,
              text: n.text,
              createdAt: n.created_at,
            }))
            setNotes(mapped)
            if (storageKey) localStorage.setItem(storageKey, JSON.stringify(mapped))
          }
        })
    }
  }, [storageKey, canSync, user?.uid])

  const saveLocal = (updated) => {
    setNotes(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const addNote = (text) => {
    if (!text.trim()) return
    const note = {
      id: canSync ? crypto.randomUUID() : `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    }
    saveLocal([note, ...notes])

    if (canSync && isRealUuid(note.id)) {
      supabase
        .from('scratchpad_notes')
        .insert({
          id: note.id,
          user_id: user.uid,
          text: note.text,
          created_at: note.createdAt,
        })
        .then(({ error }) => {
          if (error) console.error('Scratchpad insert failed:', error.message)
        })
    }

    return note
  }

  const deleteNote = (id) => {
    saveLocal(notes.filter((n) => n.id !== id))

    if (canSync && isRealUuid(id)) {
      supabase
        .from('scratchpad_notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.uid)
        .then(({ error }) => {
          if (error) console.error('Scratchpad delete failed:', error.message)
        })
    }
  }

  return { notes, addNote, deleteNote }
}
