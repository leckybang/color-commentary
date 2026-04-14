import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

export function useHeavyRotation() {
  const { user } = useAuth()
  const [itemIds, setItemIds] = useState([])

  const storageKey = user ? `cc_rotation_${user.uid}` : null

  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved) setItemIds(JSON.parse(saved))
  }, [storageKey])

  const save = (updated) => {
    setItemIds(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const addToRotation = (itemId) => {
    if (itemIds.length >= 8 || itemIds.includes(itemId)) return
    save([...itemIds, itemId])
  }

  const removeFromRotation = (itemId) => {
    save(itemIds.filter((id) => id !== itemId))
  }

  const reorder = (fromIndex, toIndex) => {
    const updated = [...itemIds]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    save(updated)
  }

  const setRotation = (ids) => {
    save(ids.slice(0, 8))
  }

  return { itemIds, addToRotation, removeFromRotation, reorder, setRotation }
}
