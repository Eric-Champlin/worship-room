import { describe, it, expect } from 'vitest'
import { PRAYER_CATEGORIES, CATEGORY_LABELS, isValidCategory } from '../prayer-categories'

describe('prayer-categories', () => {
  it('has 10 categories', () => {
    expect(PRAYER_CATEGORIES).toHaveLength(10)
  })

  it('has mental-health at index 1 after health', () => {
    expect(PRAYER_CATEGORIES[0]).toBe('health')
    expect(PRAYER_CATEGORIES[1]).toBe('mental-health')
    expect(PRAYER_CATEGORIES[2]).toBe('family')
  })

  it('isValidCategory returns true for mental-health', () => {
    expect(isValidCategory('mental-health')).toBe(true)
  })

  it('isValidCategory returns true for all category slugs', () => {
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

  it('CATEGORY_LABELS has Mental Health entry', () => {
    expect(CATEGORY_LABELS['mental-health']).toBe('Mental Health')
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
