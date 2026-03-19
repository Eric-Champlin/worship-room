import { describe, it, expect } from 'vitest'
import { PRAYER_CATEGORIES, CATEGORY_LABELS, isValidCategory } from '../prayer-categories'

describe('prayer-categories', () => {
  it('isValidCategory returns true for all 8 slugs', () => {
    for (const cat of PRAYER_CATEGORIES) {
      expect(isValidCategory(cat)).toBe(true)
    }
  })

  it('isValidCategory returns false for invalid strings', () => {
    expect(isValidCategory(null)).toBe(false)
    expect(isValidCategory('')).toBe(false)
    expect(isValidCategory('invalid')).toBe(false)
    expect(isValidCategory('HEALTH')).toBe(false)
  })

  it('CATEGORY_LABELS has entry for every category', () => {
    const labelKeys = Object.keys(CATEGORY_LABELS)
    expect(labelKeys).toHaveLength(PRAYER_CATEGORIES.length)
    for (const cat of PRAYER_CATEGORIES) {
      expect(CATEGORY_LABELS[cat]).toBeDefined()
      expect(typeof CATEGORY_LABELS[cat]).toBe('string')
    }
  })
})
