import { describe, it, expect } from 'vitest'
import {
  HELP_TAG_ORDER,
  HELP_TAG_LABELS,
  DISPLAYABLE_TAGS,
} from '../ways-to-help'

describe('ways-to-help constants', () => {
  it('HELP_TAG_ORDER includes all 5 tags in canonical order', () => {
    expect(HELP_TAG_ORDER).toEqual([
      'meals',
      'rides',
      'errands',
      'visits',
      'just_prayer',
    ])
  })

  it('HELP_TAG_LABELS has entries for all 5 tags', () => {
    expect(Object.keys(HELP_TAG_LABELS)).toHaveLength(5)
    expect(HELP_TAG_LABELS.just_prayer).toBe('Just prayer, please')
  })

  it('DISPLAYABLE_TAGS excludes just_prayer', () => {
    expect(DISPLAYABLE_TAGS).toEqual(['meals', 'rides', 'errands', 'visits'])
    expect(DISPLAYABLE_TAGS).not.toContain('just_prayer')
  })
})
