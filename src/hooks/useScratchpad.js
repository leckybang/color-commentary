import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase, shouldSync, isRealUuid } from '../lib/syncToSupabase'

/**
 * Scratchpad notes — syncs to Supabase's scratchpad_notes table for real users;
 * falls back to localStorage for demo/offline mode.
 *
 * Note shape (all optional except id, text, createdAt):
 *   { id, text, type?, creator?, year?, coverUrl?, createdAt }
 *
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
        .select('id, text, type, creator, year, cover_url, created_at')
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
              type: n.type || null,
              creator: n.creator || '',
              year: n.year || '',
              coverUrl: n.cover_url || '',
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

  /**
   * Add a scratchpad note.
   * @param {string | object} input - either the text string (legacy) or an object
   *   with `{ text, type?, creator?, year?, coverUrl? }`.
   */
  const addNote = (input) => {
    const payload = typeof input === 'string' ? { text: input } : input
    const text = (payload.text || '').trim()
    if (!text) return

    const note = {
      id: canSync ? crypto.randomUUID() : `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      type: payload.type || null,
      creator: payload.creator || '',
      year: payload.year || '',
      coverUrl: payload.coverUrl || '',
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
          type: note.type,
          creator: note.creator || null,
          year: note.year || null,
          cover_url: note.coverUrl || null,
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
