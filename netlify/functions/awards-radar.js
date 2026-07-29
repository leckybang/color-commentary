/**
 * Recent Accolades — award nominees and winners, from Wikidata.
 *
 * There is no free API for "what just got nominated for an Oscar." Wikidata
 * is the closest thing: it models `nominated for` (P1411) as structured data
 * anyone can query with SPARQL, and it's community-maintained rather than
 * scraped, so nothing here is invented.
 *
 * Coverage caveat, in plain terms: Wikidata's nomination data is good for
 * film (Best Picture) and literary prizes (Booker, Hugo) and thin-to-absent
 * for the Emmys, Grammys, and Pulitzers, whose ceremonies are modelled
 * differently. The radar treats a small result set as normal and hides the
 * shelf rather than padding it.
 *
 * Runs server-side because Wikidata wants a descriptive User-Agent and the
 * query is slow enough (a few seconds cold, sub-second warm) to be worth
 * caching away from the browser.
 */

import { corsHeaders, handleOptions } from './_shared/cors.js'

const SPARQL_URL = 'https://query.wikidata.org/sparql'
// Wikidata's access policy asks for a contactable User-Agent. Anonymous or
// generic agents get throttled first.
const USER_AGENT = 'ColorCommentary/1.0 (https://colorcommentary.app)'

// Each award maps to exactly one medium, which is why the query doesn't need
// to ask Wikidata for the work's type — a Booker nominee is a book. Awards
// that currently return nothing are kept: they cost nothing extra in the
// query, and they light up for free if Wikidata's coverage improves.
const AWARDS = {
  Q102427: { type: 'movie', label: 'Academy Award, Best Picture', short: 'Oscar nominee' },
  Q989438: { type: 'tv', label: 'Emmy, Outstanding Drama Series', short: 'Emmy nominee' },
  Q2110156: { type: 'tv', label: 'Emmy, Outstanding Comedy Series', short: 'Emmy nominee' },
  Q904528: { type: 'music', label: 'Grammy, Album of the Year', short: 'Grammy nominee' },
  Q843219: { type: 'music', label: 'Grammy, Record of the Year', short: 'Grammy nominee' },
  Q160082: { type: 'book', label: 'Booker Prize', short: 'Booker nominee' },
  Q833633: { type: 'book', label: 'Pulitzer Prize for Fiction', short: 'Pulitzer nominee' },
  Q3873144: { type: 'book', label: 'National Book Award for Fiction', short: 'NBA nominee' },
  Q18884: { type: 'book', label: "Women's Prize for Fiction", short: "Women's Prize nominee" },
  Q255032: { type: 'book', label: 'Hugo Award for Best Novel', short: 'Hugo nominee' },
}

const MAX_ITEMS = 12
// Award seasons move on the order of months. A day-long cache is generous.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
let cache = { at: 0, items: null }

/**
 * Works nominated for one of the tracked awards whose FIRST publication is
 * recent.
 *
 * The `FILTER NOT EXISTS` clause is what keeps re-releases out: a 2022 film
 * with a 2025 anniversary screening has an old P577 too, so it fails the
 * check and drops out. Without it, Avatar shows up as a new Oscar contender.
 */
function buildQuery(sinceIso) {
  const values = Object.keys(AWARDS).map((q) => `wd:${q}`).join(' ')
  return `SELECT DISTINCT ?work ?workLabel ?award ?pub ?makerLabel WHERE {
  VALUES ?award { ${values} }
  ?work wdt:P1411 ?award ; wdt:P577 ?pub .
  FILTER(?pub > "${sinceIso}"^^xsd:dateTime)
  FILTER NOT EXISTS { ?work wdt:P577 ?older . FILTER(?older < "${sinceIso}"^^xsd:dateTime) }
  OPTIONAL { ?work wdt:P57 ?maker }
  OPTIONAL { ?work wdt:P50 ?maker }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 200`
}

function awardIdFromUri(uri = '') {
  const m = String(uri).match(/Q\d+$/)
  return m ? m[0] : ''
}

/**
 * Wikidata returns one row per (work, award, maker, publication date) combo,
 * so a film with two directors and three release dates arrives six times.
 * Collapse to one entry per work, keeping the earliest publication date and
 * joining co-creators.
 */
function collapse(bindings) {
  const byWork = new Map()

  for (const row of bindings) {
    const workUri = row.work?.value || ''
    const title = row.workLabel?.value || ''
    const awardId = awardIdFromUri(row.award?.value)
    const meta = AWARDS[awardId]
    if (!workUri || !title || !meta) continue
    // An unlabelled item comes back as its own Q-id. That's a data gap, not a
    // title.
    if (/^Q\d+$/.test(title)) continue

    const pub = row.pub?.value || ''
    const maker = row.makerLabel?.value || ''

    const existing = byWork.get(workUri)
    if (!existing) {
      byWork.set(workUri, {
        title,
        creator: maker,
        type: meta.type,
        award: meta.label,
        awardShort: meta.short,
        releaseDate: pub,
        makers: maker ? new Set([maker]) : new Set(),
      })
      continue
    }
    if (maker) existing.makers.add(maker)
    if (pub && (!existing.releaseDate || pub < existing.releaseDate)) existing.releaseDate = pub
  }

  return [...byWork.values()].map((w) => ({
    title: w.title,
    creator: [...w.makers].slice(0, 2).join(', '),
    type: w.type,
    award: w.award,
    awardShort: w.awardShort,
    releaseDate: w.releaseDate,
    year: (w.releaseDate || '').slice(0, 4),
  }))
}

export async function handler(event) {
  const origin = event.headers?.origin || ''
  if (event.httpMethod === 'OPTIONS') return handleOptions(origin)

  if (cache.items && Date.now() - cache.at < CACHE_TTL_MS) {
    return {
      statusCode: 200,
      headers: { ...corsHeaders(origin), 'Cache-Control': 'public, max-age=86400' },
      body: JSON.stringify({ items: cache.items, cached: true }),
    }
  }

  // Two years back: long enough to cover a full award cycle (a film released
  // in autumn is nominated the following spring), short enough to stay "recent".
  const since = new Date()
  since.setFullYear(since.getFullYear() - 2)
  const sinceIso = `${since.toISOString().slice(0, 10)}T00:00:00Z`

  try {
    const res = await fetch(`${SPARQL_URL}?query=${encodeURIComponent(buildQuery(sinceIso))}`, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
    })
    if (!res.ok) {
      console.warn('Wikidata SPARQL failed', res.status)
      return {
        statusCode: 200,
        headers: corsHeaders(origin),
        body: JSON.stringify({ items: [], error: `wikidata ${res.status}` }),
      }
    }

    const data = await res.json()
    const items = collapse(data.results?.bindings || [])
      // Most recently published first — the freshest contenders lead.
      .sort((a, b) => String(b.releaseDate).localeCompare(String(a.releaseDate)))
      .slice(0, MAX_ITEMS)

    // Never cache an empty answer: a throttled query shouldn't blank the
    // shelf for a whole day.
    if (items.length > 0) cache = { at: Date.now(), items }

    return {
      statusCode: 200,
      headers: { ...corsHeaders(origin), 'Cache-Control': 'public, max-age=86400' },
      body: JSON.stringify({ items }),
    }
  } catch (err) {
    console.error('awards-radar failed', err)
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({ items: [], error: 'fetch failed' }),
    }
  }
}
