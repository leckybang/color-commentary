/**
 * useUpcomingWatchlist — which of your own Want-to-Try items aren't out yet.
 *
 * Fills in missing release dates a few at a time and returns the items still
 * ahead of us, soonest first. Deliberately incremental: a large watchlist
 * would otherwise fire a hundred provider requests on first load and burn
 * through the Google Books quota in one page view. A handful per session
 * fills the backlog in over a few visits, and `needsReleaseLookup` skips
 * anything already settled so the work shrinks each time.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { lookupReleaseDate, needsReleaseLookup, isUpcoming } from '../services/releaseDates'

/** Provider requests per session. Low enough to stay well inside free quotas. */
const LOOKUPS_PER_SESSION = 6

export function useUpcomingWatchlist(items, updateItem) {
  // Dates resolved this session, before the parent's catalog state catches up.
  const [resolved, setResolved] = useState({})
  // One pass per mount. Without this the effect re-runs on every catalog
  // update it causes, which is an infinite lookup loop.
  const ranRef = useRef(false)
  const abortRef = useRef(null)

  // Abort on unmount ONLY. This deliberately does not live in the lookup
  // effect's cleanup: each resolved item updates the catalog, which changes
  // that effect's deps, which would fire the cleanup and abort the batch
  // after the very first lookup.
  useEffect(() => () => abortRef.current?.abort(), [])

  const candidates = useMemo(
    () => items.filter((item) => needsReleaseLookup(item)),
    [items]
  )
  // Depend on the ids rather than the array, so an unrelated catalog edit
  // (a rating change, say) doesn't look like new work.
  const candidateKey = candidates.map((c) => c.id).join(',')

  useEffect(() => {
    if (ranRef.current || candidates.length === 0) return
    ranRef.current = true

    const controller = new AbortController()
    abortRef.current = controller
    const batch = candidates.slice(0, LOOKUPS_PER_SESSION)

    ;(async () => {
      for (const item of batch) {
        if (controller.signal.aborted) return
        let releaseDate = null
        try {
          releaseDate = await lookupReleaseDate(item, { signal: controller.signal })
        } catch {
          // A failed lookup still counts as checked — otherwise a title no
          // provider knows about is retried on every single visit.
        }
        if (controller.signal.aborted) return

        const checkedAt = new Date().toISOString()
        setResolved((prev) => ({ ...prev, [item.id]: { releaseDate, checkedAt } }))
        // Persist so other devices and later sessions skip this lookup.
        updateItem?.(item.id, { releaseDate: releaseDate || '', releaseDateCheckedAt: checkedAt })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateKey])

  const upcoming = useMemo(() => {
    return items
      .filter((item) => item.status === 'want')
      .map((item) => {
        const found = resolved[item.id]
        return found ? { ...item, releaseDate: found.releaseDate || '' } : item
      })
      .filter((item) => isUpcoming(item.releaseDate))
      .sort((a, b) => String(a.releaseDate).localeCompare(String(b.releaseDate)))
  }, [items, resolved])

  return { upcoming, pending: candidates.length }
}
