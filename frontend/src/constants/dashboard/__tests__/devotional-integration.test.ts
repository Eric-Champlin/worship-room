import { describe, it, expect } from 'vitest'
import { THEME_TO_MOOD } from '../devotional-integration'
import type { DevotionalTheme } from '@/types/devotional'

const ALL_THEMES: DevotionalTheme[] = [
  'trust',
  'gratitude',
  'forgiveness',
  'identity',
  'anxiety-and-peace',
  'faithfulness',
  'purpose',
  'hope',
  'healing',
  'community',
]

describe('THEME_TO_MOOD', () => {
  it('covers all 10 themes', () => {
    const mappedThemes = Object.keys(THEME_TO_MOOD).sort()
    expect(mappedThemes).toEqual([...ALL_THEMES].sort())
  })

  it('maps trust to [1,2]', () => {
    expect(THEME_TO_MOOD.trust).toEqual([1, 2])
  })

  it('maps gratitude to [4,5]', () => {
    expect(THEME_TO_MOOD.gratitude).toEqual([4, 5])
  })

  it('maps forgiveness to [1,2]', () => {
    expect(THEME_TO_MOOD.forgiveness).toEqual([1, 2])
  })

  it('maps identity to [2,3]', () => {
    expect(THEME_TO_MOOD.identity).toEqual([2, 3])
  })

  it('maps anxiety-and-peace to [1,2]', () => {
    expect(THEME_TO_MOOD['anxiety-and-peace']).toEqual([1, 2])
  })

  it('maps faithfulness to [3,4]', () => {
    expect(THEME_TO_MOOD.faithfulness).toEqual([3, 4])
  })

  it('maps purpose to [3,4]', () => {
    expect(THEME_TO_MOOD.purpose).toEqual([3, 4])
  })

  it('maps hope to [1,2]', () => {
    expect(THEME_TO_MOOD.hope).toEqual([1, 2])
  })

  it('maps healing to [1,2]', () => {
    expect(THEME_TO_MOOD.healing).toEqual([1, 2])
  })

  it('maps community to [4,5]', () => {
    expect(THEME_TO_MOOD.community).toEqual([4, 5])
  })
})
