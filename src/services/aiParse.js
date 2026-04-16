/**
 * Client for the Claude-powered note parser.
 * Calls our Netlify Function which proxies to the Anthropic API.
 */

export async function parseNotesWithAI(text) {
  if (!text || !text.trim()) return { items: [] }
  if (text.length > 4000) {
    throw new Error('Notes are too long. Please shorten to under 4000 characters.')
  }

  const res = await fetch('/.netlify/functions/claude-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `AI parsing failed (${res.status})`)
  }

  return await res.json()
}
