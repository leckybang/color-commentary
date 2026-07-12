/**
 * CatalogSeeds — turns taste-calibration picks into first catalog items.
 *
 * Shown on the dashboard only while the catalog is empty. Takes the creators
 * the user tapped during onboarding (artists, directors, shows, authors) and
 * looks up their notable works through the same search providers Quick Add
 * uses, so a brand-new user can start their catalog with three taps instead
 * of a blank search box.
 */

import { useEffect, useMemo, useState } from 'react'
import { Plus, Check, Library } from 'lucide-react'
import CoverArt from './common/CoverArt'
import { searchSpotify } from '../services/providers/spotify'
import { searchTMDB, searchTMDBKnownFor } from '../services/providers/tmdb'
import { searchGoogleBooks } from '../services/providers/googleBooks'
import { getMediaColor } from '../utils/filterUtils'

const MAX_SEEDS = 8

// Gather up to `perField` picks from each taste category that maps to a
// concrete lookup strategy.
function collectPicks(profile, perField = 2) {
  return {
    artists: (profile?.music?.artists || []).slice(0, perField),
    directors: (profile?.movies?.directors || []).slice(0, perField),
    shows: (profile?.tv?.shows || []).slice(0, perField),
    authors: (profile?.books?.authors || []).slice(0, perField),
  }
}

async function fetchSeeds(picks, signal) {
  const jobs = []

  for (const artist of picks.artists) {
    jobs.push(
      searchSpotify(artist, { signal }).then((results) => {
        const hit = results.find(
          (r) => r.subtype === 'album' && (r.creator || '').toLowerCase().includes(artist.toLowerCase())
        )
        return hit ? [{ ...hit, type: 'music', because: artist }] : []
      })
    )
  }

  for (const director of picks.directors) {
    jobs.push(
      searchTMDBKnownFor(director, { signal }).then((results) =>
        results.filter((r) => r.type === 'movie').slice(0, 1).map((r) => ({ ...r, because: director }))
      )
    )
  }

  for (const show of picks.shows) {
    jobs.push(
      searchTMDB(show, { signal }).then((results) => {
        const hit = results.find((r) => r.type === 'tv' && r.title.toLowerCase() === show.toLowerCase()) ||
          results.find((r) => r.type === 'tv')
        return hit ? [{ ...hit, because: show }] : []
      })
    )
  }

  for (const author of picks.authors) {
    jobs.push(
      searchGoogleBooks(`inauthor:"${author}"`, { signal }).then((results) => {
        const hit = results.find((r) => r.coverUrl) || results[0]
        return hit ? [{ ...hit, type: 'book', because: author }] : []
      })
    )
  }

  const settled = await Promise.allSettled(jobs)
  const all = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []))

  // Dedupe by type+title, cap the grid.
  const seen = new Set()
  const seeds = []
  for (const item of all) {
    const key = `${item.type}:${(item.title || '').toLowerCase()}`
    if (!item.title || seen.has(key)) continue
    seen.add(key)
    seeds.push(item)
    if (seeds.length >= MAX_SEEDS) break
  }
  return seeds
}

export default function CatalogSeeds({ profile, addItem }) {
  const picks = useMemo(() => collectPicks(profile), [profile])
  const hasPicks = Object.values(picks).some((arr) => arr.length > 0)

  const [seeds, setSeeds] = useState([])
  const [added, setAdded] = useState(() => new Set())

  useEffect(() => {
    if (!hasPicks) return
    const controller = new AbortController()
    fetchSeeds(picks, controller.signal)
      .then((results) => setSeeds(results))
      .catch(() => {})
    return () => controller.abort()
  }, [hasPicks, picks])

  if (!hasPicks || seeds.length === 0) return null

  const handleAdd = (seed) => {
    addItem({
      title: seed.title,
      creator: seed.creator || '',
      type: seed.type,
      coverUrl: seed.coverUrl || '',
      year: seed.year || (seed.releaseDate ? String(seed.releaseDate).slice(0, 4) : ''),
      genre: seed.genre || '',
      status: 'want',
    })
    setAdded((prev) => new Set([...prev, `${seed.type}:${seed.title}`]))
  }

  return (
    <div className="ink-card bg-bg-secondary rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Library size={18} className="text-accent-primary" />
        <h2 className="font-semibold text-text-primary">Start your catalog</h2>
      </div>
      <p className="text-xs text-text-muted mb-4">
        Pulled from the taste picks you made. Tap to add, then rate anything you have already finished.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {seeds.map((seed) => {
          const key = `${seed.type}:${seed.title}`
          const isAdded = added.has(key)
          return (
            <div key={key} className="flex flex-col rounded-xl bg-bg-tertiary/60 p-3">
              <CoverArt title={seed.title} type={seed.type} creator={seed.creator} coverUrl={seed.coverUrl} size="md" className="mx-auto mb-2" />
              <p className="text-xs font-semibold text-text-primary leading-snug line-clamp-2">{seed.title}</p>
              {seed.creator && <p className="text-[11px] text-text-muted truncate mt-0.5">{seed.creator}</p>}
              {seed.because.toLowerCase() !== seed.title.toLowerCase() && (
                <p className="text-[10px] mt-1 truncate" style={{ color: getMediaColor(seed.type) }}>
                  Because you picked {seed.because}
                </p>
              )}
              <div className="mt-auto pt-2">
                {isAdded ? (
                  <span className="flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-accent-books">
                    <Check size={13} /> Added
                  </span>
                ) : (
                  <button
                    onClick={() => handleAdd(seed)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                  >
                    <Plus size={13} /> Add
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
