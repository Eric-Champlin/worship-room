import { describe, it, expect } from 'vitest'
import {
  SHARE_SIZES,
  SHARE_TEMPLATES,
  DEFAULT_TEMPLATE,
  DEFAULT_SIZE,
} from '../verse-sharing'

describe('verse-sharing constants', () => {
  it('SHARE_SIZES has correct dimensions for square', () => {
    expect(SHARE_SIZES.square).toEqual({
      width: 1080,
      height: 1080,
      label: 'Square',
      hint: 'Instagram, FB',
    })
  })

  it('SHARE_SIZES has correct dimensions for story', () => {
    expect(SHARE_SIZES.story).toEqual({
      width: 1080,
      height: 1920,
      label: 'Story',
      hint: 'Stories, TikTok',
    })
  })

  it('SHARE_SIZES has correct dimensions for wide', () => {
    expect(SHARE_SIZES.wide).toEqual({
      width: 1200,
      height: 630,
      label: 'Wide',
      hint: 'Twitter/X, OG',
    })
  })

  it('SHARE_TEMPLATES has 4 entries with correct ids', () => {
    expect(SHARE_TEMPLATES).toHaveLength(4)
    expect(SHARE_TEMPLATES.map((t) => t.id)).toEqual([
      'classic',
      'radiant',
      'nature',
      'bold',
    ])
  })

  it('default values are correct', () => {
    expect(DEFAULT_TEMPLATE).toBe('classic')
    expect(DEFAULT_SIZE).toBe('square')
  })
})
