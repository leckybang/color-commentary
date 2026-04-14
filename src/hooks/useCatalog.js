import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

export function useCatalog() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const storageKey = user ? `cc_catalog_${user.uid}` : null

  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      setItems(JSON.parse(saved))
    }
    setLoading(false)
  }, [storageKey])

  const save = (updated) => {
    setItems(updated)
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(updated))
    }
  }

  const addItem = (item) => {
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dateAdded: new Date().toISOString(),
      rating: 0,
      review: '',
      status: 'want',
      coverUrl: '',
      genre: '',
      ...item,
    }
    save([newItem, ...items])
    return newItem
  }

  const updateItem = (id, updates) => {
    save(items.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const deleteItem = (id) => {
    save(items.filter((item) => item.id !== id))
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
