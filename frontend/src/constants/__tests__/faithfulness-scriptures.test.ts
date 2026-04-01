import { describe, it, expect } from 'vitest'
import { FAITHFULNESS_SCRIPTURES } from '../faithfulness-scriptures'

describe('FAITHFULNESS_SCRIPTURES', () => {
  it('has exactly 6 entries', () => {
    expect(FAITHFULNESS_SCRIPTURES).toHaveLength(6)
  })

  it('each scripture has non-empty text and reference', () => {
    for (const scripture of FAITHFULNESS_SCRIPTURES) {
      expect(scripture.text.length).toBeGreaterThan(0)
      expect(scripture.reference.length).toBeGreaterThan(0)
    }
  })

  it('references match expected book:verse format', () => {
    const refPattern = /^[A-Z][a-z]+ \d+:\d+$/
    for (const scripture of FAITHFULNESS_SCRIPTURES) {
      expect(scripture.reference).toMatch(refPattern)
    }
  })
})
