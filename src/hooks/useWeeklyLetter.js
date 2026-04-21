/**
 * useWeeklyLetter — fetches and caches the Claude-generated weekly radar letter.
 *
 * For demo users: returns the template letter synchronously (no Claude call).
 * For real users: calls the claude-radar-letter Netlify function, caches the
 * result in localStorage keyed to the user + current week. Falls back to the
 * template letter if Claude is unavailable.
 *
 * The letter is returned in a normalized shape:
 *   { greeting, paragraphs[], featuredTitles[], closing, signoff, weekLabel }
 *
 * This shape is the same whether it came from Claude or the template fallback,
 * so the caller doesn't need to branch on which source it came from.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { generateWeeklyLetter } from '../utils/weeklyLetter'

const LETTER_TTL_MS = 30 * 60 * 1000 // 30 min — same as radar cache

function weekKey() {
  const d = new Date()
  const year = d.getFullYear()
  const onejan = new Date(year, 0, 1)
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7)
  return `${year}-W${week}`
}

function letterCacheKey(uid) {
  return `cc_letter_v2_${uid}_${weekKey()}`
}

function readLetterCache(uid) {
  try {
    const raw = localStorage.getItem(letterCacheKey(uid))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.greeting || !parsed.cachedAt) return null
    if (Date.now() - parsed.cachedAt > LETTER_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeLetterCache(uid, letter) {
  try {
    localStorage.setItem(letterCacheKey(uid), JSON.stringify({ ...letter, cachedAt: Date.now() }))
  } catch {}
}

function clearLetterCache(uid) {
  try {
    localStorage.removeItem(letterCacheKey(uid))
  } catch {}
}

// Convert the template letter shape into the normalized shape.
function templateToNormalized(templateLetter) {
  if (!templateLetter) return null
  const paragraphs = []
  if (templateLetter.intro) paragraphs.push(templateLetter.intro)
  for (const s of templateLetter.sections || []) {
    const header = s.title ? `**${s.emoji ? s.emoji + ' ' : ''}${s.title}** ` : ''
    paragraphs.push((header + s.body).trim())
  }
  return {
    greeting: templateLetter.greeting || '',
    paragraphs,
    featuredTitles: [],
    closing: templateLetter.closing || '',
    signoff: templateLetter.signoff || '— Your Color Commentary Radar',
    weekLabel: templateLetter.weekLabel || '',
  }
}

export function useWeeklyLetter({ user, isDemo, profile, catalogItems, radar }) {
  const [letter, setLetter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Hold latest data in a ref so the effect can read current values without
  // listing mutable objects as dependencies (which would cause constant re-fires).
  const latestRef = useRef({})
  latestRef.current = { profile, catalogItems, radar }

  useEffect(() => {
    const { profile, catalogItems, radar } = latestRef.current

    // No radar yet — nothing to compose a letter from.
    if (!radar) {
      setLetter(null)
      setLoading(false)
      return
    }

    // Demo users get the template letter immediately — no Claude call.
    if (isDemo || !user) {
      const template = generateWeeklyLetter(profile, radar)
      setLetter(templateToNormalized(template))
      setLoading(false)
      return
    }

    // Check localStorage cache (skipped when refreshKey > 0)
    if (refreshKey === 0) {
      const cached = readLetterCache(user.uid)
      if (cached) {
        setLetter(cached)
        setLoading(false)
        return
      }
    }

    // Fetch a fresh Claude letter
    setLoading(true)
    const allItems = [...(radar.newReleases || []), ...(radar.discoveries || [])]

    fetch('/.netlify/functions/claude-radar-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, catalogItems, radarItems: allItems }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (data.fallback || !data.greeting) {
          // Claude call failed — fall back to template
          const template = generateWeeklyLetter(latestRef.current.profile, latestRef.current.radar)
          setLetter(templateToNormalized(template))
        } else {
          const normalized = {
            greeting: data.greeting,
            paragraphs: data.paragraphs || [],
            featuredTitles: data.featuredTitles || [],
            closing: data.closing || '',
            signoff: '— Your Color Commentary Radar',
            weekLabel: data.weekLabel || '',
          }
          writeLetterCache(user.uid, normalized)
          setLetter(normalized)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('useWeeklyLetter fetch failed', err)
        // Fallback to template on any network/parse error
        const template = generateWeeklyLetter(latestRef.current.profile, latestRef.current.radar)
        setLetter(templateToNormalized(template))
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isDemo, !!radar, refreshKey])

  const refresh = useCallback(() => {
    if (user?.uid) clearLetterCache(user.uid)
    setRefreshKey((k) => k + 1)
  }, [user?.uid])

  return { letter, letterLoading: loading, refreshLetter: refresh }
}
