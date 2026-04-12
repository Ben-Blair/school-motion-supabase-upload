// Used when the user submits the video search form (see App.tsx).

/** If the string is OK, returns null. Otherwise returns an error message for the UI. */
export function validateVideoSearch(raw: string): string | null {
  const q = raw.trim()

  if (q.length === 0) {
    return 'Enter a search term.'
  }
  if (q.length < 2) {
    return 'Use at least 2 characters.'
  }
  if (q.length > 80) {
    return 'Use at most 80 characters.'
  }
  if (q.includes('@')) {
    return 'Do not use the @ character.'
  }

  return null
}
