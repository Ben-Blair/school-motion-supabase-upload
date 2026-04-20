/**
 * Rubric mapping (course “C level” / validation requirements):
 *
 * • Happy path unit test — valid input passes validation and returns the expected
 *   normalized output (successful “submission” of a search term).
 *
 * • Validation of edge cases — at least three invalid scenarios:
 *   – empty input
 *   – wrong format (@)
 *   – boundary value (over max length; we also test valid max length separately)
 */

import { describe, expect, it } from 'vitest'
import { parseSearchQuery } from './searchValidation.js'

// ---------------------------------------------------------------------------
// Rubric: Happy path — valid data passes validation; correct output (normalized query)
// ---------------------------------------------------------------------------
describe('parseSearchQuery — happy path', () => {
  it('accepts valid trimmed text and returns the normalized query', () => {
    const result = parseSearchQuery('  frog  ')
    expect(result).toEqual({ ok: true, query: 'frog' })
  })
})

// ---------------------------------------------------------------------------
// Rubric: Edge cases — invalid inputs (empty, wrong format, boundary)
// ---------------------------------------------------------------------------
describe('parseSearchQuery — invalid inputs (edge cases)', () => {
  // Rubric edge case #1: empty (and whitespace-only — trims to empty)
  it('rejects empty input (including whitespace-only)', () => {
    expect(parseSearchQuery('')).toMatchObject({ ok: false })
    expect(parseSearchQuery('   ')).toMatchObject({ ok: false })
  })

  // Rubric edge case #2: wrong format (example: disallowed @ character)
  it('rejects wrong format: @ character', () => {
    expect(parseSearchQuery('foo@bar')).toEqual({
      ok: false,
      error: 'Do not use the @ character.',
    })
  })

  // Rubric edge case #3: boundary — over the allowed maximum length
  it('rejects boundary: over 80 characters', () => {
    const tooLong = 'a'.repeat(81)
    expect(parseSearchQuery(tooLong)).toEqual({
      ok: false,
      error: 'Use at most 80 characters.',
    })
  })
})

// ---------------------------------------------------------------------------
// Extra: boundary happy path — exactly at max length (80) is still valid
// (pairs with the “over 80” invalid test above; not a separate rubric row)
// ---------------------------------------------------------------------------
describe('parseSearchQuery — boundary (valid max length)', () => {
  it('accepts exactly 80 characters', () => {
    const q = 'a'.repeat(80)
    expect(parseSearchQuery(q)).toEqual({ ok: true, query: q })
  })
})
