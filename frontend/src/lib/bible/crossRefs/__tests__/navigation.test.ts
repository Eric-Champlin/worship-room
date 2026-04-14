import { describe, expect, it } from 'vitest'
import { buildCrossRefRoute } from '../navigation'

describe('buildCrossRefRoute', () => {
  it('returns /bible/romans/5 for (romans, 5, 8)', () => {
    expect(buildCrossRefRoute('romans', 5, 8)).toBe('/bible/romans/5')
  })

  it('handles hyphenated slugs (/bible/1-corinthians/13)', () => {
    expect(buildCrossRefRoute('1-corinthians', 13, 4)).toBe('/bible/1-corinthians/13')
  })

  it('handles chapter 1 (/bible/genesis/1)', () => {
    expect(buildCrossRefRoute('genesis', 1, 1)).toBe('/bible/genesis/1')
  })
})
