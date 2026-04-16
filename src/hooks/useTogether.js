import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase, shouldSync, isRealUuid } from '../lib/syncToSupabase'

/**
 * Group Chat sessions — stored across three tables:
 * - together_sessions (session metadata)
 * - together_participants (who's in)
 * - together_notes (messages in the thread)
 *
 * This hook loads sessions where the user is a participant and maintains
 * the denormalized {sessions} shape used by the UI.
 */
export function useTogether() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])

  const storageKey = user ? `cc_together_${user.uid}` : null
  const canSync = shouldSync(user)

  useEffect(() => {
    if (!storageKey) return

    const saved = localStorage.getItem(storageKey)
    if (saved) setSessions(JSON.parse(saved))

    if (canSync) {
      loadSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, canSync, user?.uid])

  const loadSessions = async () => {
    try {
      // Get all sessions where this user is a participant
      const { data: participantRows, error: partErr } = await supabase
        .from('together_participants')
        .select('session_id')
        .eq('user_id', user.uid)
      if (partErr) {
        console.error('Together participants fetch failed:', partErr.message)
        return
      }
      const sessionIds = (participantRows || []).map((r) => r.session_id)
      if (sessionIds.length === 0) {
        setSessions([])
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify([]))
        return
      }

      // Pull sessions + all their participants + all their notes in parallel
      const [sessRes, allPartsRes, notesRes] = await Promise.all([
        supabase.from('together_sessions').select('*').in('id', sessionIds).order('updated_at', { ascending: false }),
        supabase.from('together_participants').select('session_id, user_id, status').in('session_id', sessionIds),
        supabase.from('together_notes').select('id, session_id, user_id, text, created_at').in('session_id', sessionIds).order('created_at', { ascending: true }),
      ])

      if (sessRes.error) {
        console.error('Together sessions fetch failed:', sessRes.error.message)
        return
      }

      // Get display names for all participants
      const allUserIds = [...new Set([
        ...(allPartsRes.data || []).map((p) => p.user_id),
        ...(notesRes.data || []).map((n) => n.user_id),
      ])]
      let profileMap = {}
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', allUserIds)
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p.display_name || 'User']))
      }

      // Assemble denormalized shape
      const mapped = (sessRes.data || []).map((s) => {
        const parts = (allPartsRes.data || [])
          .filter((p) => p.session_id === s.id)
          .map((p) => ({
            userId: p.user_id,
            displayName: profileMap[p.user_id] || 'User',
            status: p.status,
          }))
        const notes = (notesRes.data || [])
          .filter((n) => n.session_id === s.id)
          .map((n) => ({
            id: n.id,
            userId: n.user_id,
            displayName: profileMap[n.user_id] || 'User',
            text: n.text,
            createdAt: n.created_at,
          }))
        return {
          id: s.id,
          mediaTitle: s.media_title,
          mediaCreator: s.media_creator || '',
          mediaType: s.media_type,
          creatorId: s.creator_id,
          creatorName: profileMap[s.creator_id] || 'User',
          participants: parts,
          status: s.status,
          notes,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        }
      })

      setSessions(mapped)
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(mapped))
    } catch (err) {
      console.error('Together load error:', err)
    }
  }

  const saveLocal = (updated) => {
    setSessions(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const createSession = ({ mediaTitle, mediaCreator, mediaType, invitee }) => {
    const session = {
      id: canSync ? crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mediaTitle,
      mediaCreator: mediaCreator || '',
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
    saveLocal([session, ...sessions])

    if (canSync && isRealUuid(session.id) && isRealUuid(invitee.userId)) {
      const now = new Date().toISOString()
      Promise.all([
        supabase.from('together_sessions').insert({
          id: session.id,
          creator_id: user.uid,
          media_title: mediaTitle,
          media_creator: mediaCreator || null,
          media_type: mediaType,
          status: 'proposed',
          created_at: now,
          updated_at: now,
        }),
        supabase.from('together_participants').insert([
          { session_id: session.id, user_id: user.uid, status: 'accepted', joined_at: now },
          { session_id: session.id, user_id: invitee.userId, status: 'pending', joined_at: now },
        ]),
      ]).then(([sessRes, partRes]) => {
        if (sessRes.error) console.error('Create session failed:', sessRes.error.message)
        if (partRes.error) console.error('Participants insert failed:', partRes.error.message)
      })
    }

    return session
  }

  const updateStatus = (sessionId, status) => {
    const now = new Date().toISOString()
    saveLocal(
      sessions.map((s) => (s.id === sessionId ? { ...s, status, updatedAt: now } : s))
    )

    if (canSync && isRealUuid(sessionId)) {
      supabase
        .from('together_sessions')
        .update({ status, updated_at: now })
        .eq('id', sessionId)
        .then(({ error }) => {
          if (error) console.error('Update status failed:', error.message)
        })
    }
  }

  const addNote = (sessionId, text) => {
    const noteId = canSync ? crypto.randomUUID() : `note-${Date.now()}`
    const now = new Date().toISOString()
    const note = {
      id: noteId,
      userId: user.uid,
      displayName: user.displayName,
      text,
      createdAt: now,
    }
    saveLocal(
      sessions.map((s) =>
        s.id === sessionId
          ? { ...s, notes: [...s.notes, note], updatedAt: now }
          : s
      )
    )

    if (canSync && isRealUuid(sessionId) && isRealUuid(noteId)) {
      Promise.all([
        supabase.from('together_notes').insert({
          id: noteId,
          session_id: sessionId,
          user_id: user.uid,
          text,
          created_at: now,
        }),
        supabase.from('together_sessions').update({ updated_at: now }).eq('id', sessionId),
      ]).then(([noteRes]) => {
        if (noteRes.error) console.error('Add note failed:', noteRes.error.message)
      })
    }
  }

  const deleteSession = (sessionId) => {
    saveLocal(sessions.filter((s) => s.id !== sessionId))

    if (canSync && isRealUuid(sessionId)) {
      // FK cascades will clean up participants + notes
      supabase
        .from('together_sessions')
        .delete()
        .eq('id', sessionId)
        .then(({ error }) => {
          if (error) console.error('Delete session failed:', error.message)
        })
    }
  }

  return { sessions, createSession, updateStatus, addNote, deleteSession }
}
