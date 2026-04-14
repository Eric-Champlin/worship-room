import { describe, expect, it } from 'vitest'
import { HIGHLIGHT_EMOTIONS } from '@/constants/bible'
import type { HighlightColor } from '@/types/bible'

describe('HIGHLIGHT_EMOTIONS', () => {
  it('has exactly 5 entries', () => {
    expect(HIGHLIGHT_EMOTIONS).toHaveLength(5)
  })

  it('each entry has key, label, and hex', () => {
    for (const emotion of HIGHLIGHT_EMOTIONS) {
      expect(emotion).toHaveProperty('key')
      expect(emotion).toHaveProperty('label')
      expect(emotion).toHaveProperty('hex')
      expect(typeof emotion.key).toBe('string')
      expect(typeof emotion.label).toBe('string')
      expect(emotion.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('all 5 HighlightColor values are represented', () => {
    const keys = HIGHLIGHT_EMOTIONS.map((e) => e.key)
    const expected: HighlightColor[] = ['peace', 'conviction', 'joy', 'struggle', 'promise']
    expect(keys).toEqual(expected)
  })
})
