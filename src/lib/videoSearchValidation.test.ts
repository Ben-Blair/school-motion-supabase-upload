import { describe, expect, it } from 'vitest'
import { validateVideoSearch } from './videoSearchValidation'

describe('video search — happy path', () => {
  it('accepts a normal search after trimming', () => {
    expect(validateVideoSearch('frog')).toBe(null)
    expect(validateVideoSearch('  ab  ')).toBe(null)
  })
})
