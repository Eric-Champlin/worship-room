import { describe, it, expect } from 'vitest'
import { formatThemeName } from '../devotional'

describe('formatThemeName', () => {
  it('converts hyphens to spaces and title-cases', () => {
    expect(formatThemeName('anxiety-and-peace')).toBe('Anxiety and Peace')
  })

  it('handles single-word themes', () => {
    expect(formatThemeName('trust')).toBe('Trust')
  })

  it('handles multi-word hyphenated themes', () => {
    expect(formatThemeName('anxiety-and-peace')).toBe('Anxiety and Peace')
  })

  it('handles gratitude', () => {
    expect(formatThemeName('gratitude')).toBe('Gratitude')
  })

  it('handles identity', () => {
    expect(formatThemeName('identity')).toBe('Identity')
  })
})
