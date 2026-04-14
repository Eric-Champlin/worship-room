import { describe, expect, it } from 'vitest'
import {
  HIGHLIGHT_ORB_COLORS,
  LONG_PASSAGE_THRESHOLD,
  SHARE_FORMAT_IDS,
  SHARE_FORMATS,
} from '@/constants/bible-share'
import type { HighlightColor } from '@/types/bible'
import type { ShareFormat } from '@/types/bible-share'

describe('SHARE_FORMATS', () => {
  it('has all 4 formats', () => {
    const keys = Object.keys(SHARE_FORMATS)
    expect(keys).toEqual(['square', 'story', 'portrait', 'wide'])
  })

  it('each format has correct 2x canvas dimensions', () => {
    for (const [, dims] of Object.entries(SHARE_FORMATS)) {
      expect(dims.canvasWidth).toBe(dims.exportWidth * 2)
      expect(dims.canvasHeight).toBe(dims.exportHeight * 2)
    }
  })

  it('each format has a label and hint', () => {
    for (const [, dims] of Object.entries(SHARE_FORMATS)) {
      expect(typeof dims.label).toBe('string')
      expect(dims.label.length).toBeGreaterThan(0)
      expect(typeof dims.hint).toBe('string')
      expect(dims.hint.length).toBeGreaterThan(0)
    }
  })
})

describe('SHARE_FORMAT_IDS', () => {
  it('matches SHARE_FORMATS keys', () => {
    const keys = Object.keys(SHARE_FORMATS) as ShareFormat[]
    expect(SHARE_FORMAT_IDS).toEqual(keys)
  })
})

describe('HIGHLIGHT_ORB_COLORS', () => {
  it('covers all HighlightColor values', () => {
    const expected: HighlightColor[] = ['peace', 'conviction', 'joy', 'struggle', 'promise']
    for (const color of expected) {
      expect(HIGHLIGHT_ORB_COLORS[color]).toBeDefined()
      expect(HIGHLIGHT_ORB_COLORS[color]).toMatch(/^rgba\(/)
    }
  })
})

describe('LONG_PASSAGE_THRESHOLD', () => {
  it('is 800', () => {
    expect(LONG_PASSAGE_THRESHOLD).toBe(800)
  })
})
