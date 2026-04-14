import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { getWeekId, getWeekRange } from '../utils/dateUtils'

export function useWeeklyDumps() {
  const { user } = useAuth()
  const [dumps, setDumps] = useState([])
  const [loading, setLoading] = useState(true)

  const storageKey = user ? `cc_dumps_${user.uid}` : null

  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      setDumps(JSON.parse(saved))
    }
    setLoading(false)
  }, [storageKey])

  const save = (updated) => {
    setDumps(updated)
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(updated))
    }
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
      save(updated)
    } else {
      save([entry, ...dumps])
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
