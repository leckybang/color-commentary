import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { getWeekId, getWeekRange } from '../utils/dateUtils'
import { supabase, shouldSync } from '../lib/syncToSupabase'

/**
 * Weekly liner notes — one row per (user_id, week_id) in weekly_dumps,
 * full dump stored as JSONB.
 */
export function useWeeklyDumps() {
  const { user } = useAuth()
  const [dumps, setDumps] = useState([])
  const [loading, setLoading] = useState(true)

  const storageKey = user ? `cc_dumps_${user.uid}` : null
  const canSync = shouldSync(user)

  useEffect(() => {
    if (!storageKey) return

    const saved = localStorage.getItem(storageKey)
    if (saved) setDumps(JSON.parse(saved))
    setLoading(false)

    if (canSync) {
      supabase
        .from('weekly_dumps')
        .select('week_id, data, updated_at')
        .eq('user_id', user.uid)
        .order('week_id', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Weekly dumps fetch failed:', error.message)
            return
          }
          if (data) {
            const mapped = data.map((r) => ({ ...r.data, weekId: r.week_id }))
            setDumps(mapped)
            if (storageKey) localStorage.setItem(storageKey, JSON.stringify(mapped))
          }
        })
    }
  }, [storageKey, canSync, user?.uid])

  const saveLocal = (updated) => {
    setDumps(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const getCurrentWeekDump = () => {
    const weekId = getWeekId()
    return dumps.find((d) => d.weekId === weekId) || null
  }

  const saveDump = (dump) => {
    const weekId = dump.weekId || getWeekId()
    const { start, end } = getWeekRange(new Date(weekId))
    const existing = dumps.findIndex((d) => d.weekId === weekId)

    const entry = {
      weekId,
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      watching: [],
      listening: [],
      reading: [],
      discovered: [],
      notes: '',
      createdAt: new Date().toISOString(),
      ...dump,
      updatedAt: new Date().toISOString(),
    }

    if (existing >= 0) {
      const updated = [...dumps]
      updated[existing] = { ...updated[existing], ...entry }
      saveLocal(updated)
    } else {
      saveLocal([entry, ...dumps])
    }

    if (canSync) {
      supabase
        .from('weekly_dumps')
        .upsert({
          user_id: user.uid,
          week_id: weekId,
          data: entry,
          updated_at: entry.updatedAt,
        }, { onConflict: 'user_id,week_id' })
        .then(({ error }) => {
          if (error) console.error('Weekly dump sync failed:', error.message)
        })
    }
  }

  const getStreak = () => {
    let streak = 0
    const now = new Date()
    for (let i = 0; i < 52; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const wId = getWeekId(d)
      if (dumps.some((dump) => dump.weekId === wId)) {
        streak++
      } else if (i > 0) {
        break
      }
    }
    return streak
  }

  return { dumps, loading, getCurrentWeekDump, saveDump, getStreak }
}
