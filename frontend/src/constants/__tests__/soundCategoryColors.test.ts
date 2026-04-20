import { describe, expect, it } from 'vitest'
import { SOUND_CATEGORIES } from '@/data/sound-catalog'
import {
  SOUND_CATEGORY_COLORS,
  SOUND_CATEGORY_LABELS,
} from '@/constants/soundCategoryColors'

const EXPECTED_CATEGORIES = ['nature', 'environments', 'spiritual', 'instruments']
const REQUIRED_TOKEN_FIELDS = [
  'bgClass',
  'borderClass',
  'iconInactiveClass',
  'iconActiveClass',
  'activeGlow',
] as const

describe('SOUND_CATEGORY_COLORS', () => {
  it('exports tokens for all 4 categories', () => {
    expect(Object.keys(SOUND_CATEGORY_COLORS).sort()).toEqual(
      [...EXPECTED_CATEGORIES].sort(),
    )
  })

  it('each token has all 5 required fields', () => {
    for (const [category, tokens] of Object.entries(SOUND_CATEGORY_COLORS)) {
      for (const field of REQUIRED_TOKEN_FIELDS) {
        expect(
          tokens[field],
          `${category}.${field} must be a non-empty string`,
        ).toBeTypeOf('string')
        expect(tokens[field].length).toBeGreaterThan(0)
      }
    }
  })

  it('every key in SOUND_CATEGORY_COLORS has a matching label', () => {
    for (const key of Object.keys(SOUND_CATEGORY_COLORS)) {
      expect(SOUND_CATEGORY_LABELS).toHaveProperty(key)
      expect(SOUND_CATEGORY_LABELS[key as keyof typeof SOUND_CATEGORY_LABELS].length)
        .toBeGreaterThan(0)
    }
  })

  it('category IDs align with the SOUND_CATEGORIES catalog', () => {
    const catalogIds = new Set(SOUND_CATEGORIES.map((g) => g.category))
    for (const key of Object.keys(SOUND_CATEGORY_COLORS)) {
      expect(catalogIds.has(key as 'nature')).toBe(true)
    }
  })
})
