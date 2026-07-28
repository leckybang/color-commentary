import { useState, useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase, shouldSync, isRealUuid } from '../lib/syncToSupabase'
import { normalizeRating } from '../utils/ratingUtils'
import { sanitizeVibeTags } from '../data/vibeTags'

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
    // numeric(2,1) can arrive as a string depending on the driver path.
    rating: normalizeRating(row.rating),
    review: row.review || '',
    coverUrl: row.cover_url || '',
    year: row.year || '',
    dateAdded: row.date_added || row.created_at,
    dateConsumed: row.date_consumed || null,
    hidden: !!row.hidden,
    vibeTags: sanitizeVibeTags(row.vibe_tags),
    releaseDate: row.release_date || '',
    releaseDateCheckedAt: row.release_date_checked_at || null,
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
    rating: normalizeRating(item.rating),
    review: item.review || '',
    cover_url: item.coverUrl || null,
    year: item.year || null,
    date_added: item.dateAdded || new Date().toISOString(),
    date_consumed: item.dateConsumed || null,
    hidden: !!item.hidden,
    vibe_tags: sanitizeVibeTags(item.vibeTags),
    release_date: item.releaseDate || null,
    release_date_checked_at: item.releaseDateCheckedAt || null,
  }
}

/**
 * A rating means you actually experienced something — so a rated item can't
 * still be "Want to Try." Promote those to Finished, and make sure every
 * Finished item carries a completion date so Insights can place it in time.
 */
function applyRatingRule(item) {
  // Also the normalization pass for items rehydrated from localStorage, which
  // predate half-steps and the vibe-tag field.
  let next = { ...item, rating: normalizeRating(item.rating), vibeTags: sanitizeVibeTags(item.vibeTags) }
  if ((next.rating || 0) > 0 && next.status === 'want') {
    next = { ...next, status: 'finished' }
  }
  if (next.status === 'finished' && !next.dateConsumed) {
    next = { ...next, dateConsumed: next.dateAdded || new Date().toISOString() }
  }
  return next
}

export function useCatalog() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  // Mirrors `items` for the mutation helpers below. They used to rebuild the
  // list from the `items` closure, which is stale the moment two updates
  // happen before a re-render — each one recomputes from the same snapshot and
  // the last write silently drops the others. The release-date lookup does
  // exactly that (several items resolving in a row), but two quick taps on
  // different cards would have hit it too.
  const itemsRef = useRef(items)
  const commit = (updated) => {
    itemsRef.current = updated
    setItems(updated)
  }

  const storageKey = user ? `cc_catalog_${user.uid}` : null
  const canSync = shouldSync(user)

  useEffect(() => {
    if (!storageKey) return

    const saved = localStorage.getItem(storageKey)
    if (saved) commit(JSON.parse(saved).map(applyRatingRule))
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
            const migrated = mapped.map(applyRatingRule)
            commit(migrated)
            if (storageKey) localStorage.setItem(storageKey, JSON.stringify(migrated))
            // One-time backfill: persist any rows the rule promoted (rated but
            // still "want", or finished with no date). Idempotent — once written
            // they come back already-correct and produce no further changes.
            const changed = migrated.filter(
              (m, i) => isRealUuid(m.id) && (m.status !== mapped[i].status || m.dateConsumed !== mapped[i].dateConsumed)
            )
            changed.forEach((c) => {
              supabase
                .from('catalog_items')
                .update(toDb(c, user.uid))
                .eq('id', c.id)
                .eq('user_id', user.uid)
                .then(({ error: e }) => { if (e) console.error('Rating-rule backfill failed:', e.message) })
            })
          }
        })
    }
  }, [storageKey, canSync, user?.uid])

  const saveLocal = (updated) => {
    commit(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const addItem = (item) => {
    const newItem = applyRatingRule({
      id: canSync ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dateAdded: new Date().toISOString(),
      rating: 0,
      review: '',
      status: 'want',
      coverUrl: '',
      genre: '',
      year: '',
      vibeTags: [],
      ...item,
    })
    saveLocal([newItem, ...itemsRef.current])

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
    const next = itemsRef.current.map((item) => (item.id === id ? applyRatingRule({ ...item, ...updates }) : item))
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
    saveLocal(itemsRef.current.filter((item) => item.id !== id))

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
