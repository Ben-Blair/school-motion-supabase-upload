/**
 * Validates search input for the video list.
 * @returns {{ ok: true, query: string } | { ok: false, error: string }}
 */
export function parseSearchQuery(raw) {
  const q = String(raw ?? '').trim()

  if (q.length === 0) {
    return { ok: true, query: '' }
  }
  if (q.length < 2) {
    return { ok: false, error: 'Use at least 2 characters.' }
  }
  if (q.length > 80) {
    return { ok: false, error: 'Use at most 80 characters.' }
  }
  if (q.includes('@')) {
    return { ok: false, error: 'Do not use the @ character.' }
  }

  return { ok: true, query: q }
}
