import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase, shouldSync, isRealUuid } from '../lib/syncToSupabase'

/**
 * Map a Supabase row (snake_case) → app item shape (camelCase).
 */
function fromDb(row) {
  return {
    id: row.id,
    title: row.title,
    creator: row.creator || '',
    type: row.type,
    genre: row.genre || '',
    status: row.status || 'want',
    rating: row.rating || 0,
    review: row.review || '',
    coverUrl: row.cover_url || '',
    year: row.year || '',
    dateAdded: row.date_added || row.created_at,
    dateConsumed: row.date_consumed || null,
  }
}

/**
 * Map app item shape → Supabase columns.
 */
function toDb(item, userId) {
  return {
    id: item.id,
    user_id: userId,
    title: item.title,
    creator: item.creator || null,
    type: item.type,
    genre: item.genre || null,
    status: item.status || 'want',
    rating: item.rating || 0,
    review: item.review || '',
    cover_url: item.coverUrl || null,
    year: item.year || null,
    date_added: item.dateAdded || new Date().toISOString(),
    date_consumed: item.dateConsumed || null,
  }
}

export function useCatalog() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const storageKey = user ? `cc_catalog_${user.uid}` : null
  const canSync = shouldSync(user)

  useEffect(() => {
    if (!storageKey) return

    const saved = localStorage.getItem(storageKey)
    if (saved) setItems(JSON.parse(saved))
    setLoading(false)

    if (canSync) {
      supabase
        .from('catalog_items')
        .select('*')
        .eq('user_id', user.uid)
        .order('date_added', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Catalog fetch failed:', error.message)
            return
          }
          if (data) {
            const mapped = data.map(fromDb)
            setItems(mapped)
            if (storageKey) localStorage.setItem(storageKey, JSON.stringify(mapped))
          }
        })
    }
  }, [storageKey, canSync, user?.uid])

  const saveLocal = (updated) => {
    setItems(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const addItem = (item) => {
    const newItem = {
      id: canSync ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dateAdded: new Date().toISOString(),
      rating: 0,
      review: '',
      status: 'want',
      coverUrl: '',
      genre: '',
      year: '',
      ...item,
    }
    saveLocal([newItem, ...items])

    if (canSync && isRealUuid(newItem.id)) {
      supabase
        .from('catalog_items')
        .insert(toDb(newItem, user.uid))
        .then(({ error }) => {
          if (error) console.error('Catalog insert failed:', error.message)
        })
    }

    return newItem
  }

  const updateItem = (id, updates) => {
    const next = items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    saveLocal(next)

    if (canSync && isRealUuid(id)) {
      const full = next.find((i) => i.id === id)
      if (full) {
        supabase
          .from('catalog_items')
          .update(toDb(full, user.uid))
          .eq('id', id)
          .eq('user_id', user.uid)
          .then(({ error }) => {
            if (error) console.error('Catalog update failed:', error.message)
          })
      }
    }
  }

  const deleteItem = (id) => {
    saveLocal(items.filter((item) => item.id !== id))

    if (canSync && isRealUuid(id)) {
      supabase
        .from('catalog_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.uid)
        .then(({ error }) => {
          if (error) console.error('Catalog delete failed:', error.message)
        })
    }
  }

  const getByType = (type) => items.filter((item) => item.type === type)

  const getStats = () => {
    const total = items.length
    const byType = { music: 0, movie: 0, tv: 0, book: 0 }
    const byStatus = { watching: 0, finished: 0, dropped: 0, want: 0 }
    let totalRated = 0
    let ratingSum = 0

    items.forEach((item) => {
      if (byType[item.type] !== undefined) byType[item.type]++
      if (byStatus[item.status] !== undefined) byStatus[item.status]++
      if (item.rating > 0) {
        totalRated++
        ratingSum += item.rating
      }
    })

    return {
      total,
      byType,
      byStatus,
      avgRating: totalRated > 0 ? (ratingSum / totalRated).toFixed(1) : 0,
    }
  }

  return { items, loading, addItem, updateItem, deleteItem, getByType, getStats }
}
