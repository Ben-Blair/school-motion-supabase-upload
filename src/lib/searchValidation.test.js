import { describe, expect, it } from 'vitest'
import { parseSearchQuery } from './searchValidation.js'

describe('parseSearchQuery — happy path', () => {
  it('accepts valid trimmed text and returns the normalized query', () => {
    const result = parseSearchQuery('  frog  ')
    expect(result).toEqual({ ok: true, query: 'frog' })
  })
})
