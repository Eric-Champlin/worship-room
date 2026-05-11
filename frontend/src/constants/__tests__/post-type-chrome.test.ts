import { describe, expect, it } from 'vitest'
import { POST_TYPES } from '@/constants/post-types'
import { PER_TYPE_CHROME, getPerTypeChromeClass } from '../post-type-chrome'

describe('post-type-chrome', () => {
  it('has an entry for every PostType in POST_TYPES', () => {
    for (const entry of POST_TYPES) {
      expect(PER_TYPE_CHROME).toHaveProperty(entry.id)
    }
  })

  it('returns the rose accent string for encouragement', () => {
    expect(getPerTypeChromeClass('encouragement')).toBe('border-rose-200/10 bg-rose-500/[0.04]')
  })

  it('returns an empty baseline string for prayer_request', () => {
    expect(getPerTypeChromeClass('prayer_request')).toBe('')
  })
})
