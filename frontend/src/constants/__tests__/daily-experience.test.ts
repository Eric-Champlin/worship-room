import { describe, expect, it } from 'vitest'
import { VERSE_FRAMINGS } from '../daily-experience'

describe('VERSE_FRAMINGS', () => {
  it('has pray key with correct framing line', () => {
    expect(VERSE_FRAMINGS.pray).toBe('What do you want to say to God about this?')
  })

  it('has journal key with correct framing line', () => {
    expect(VERSE_FRAMINGS.journal).toBe('What comes up as you sit with this?')
  })

  it('has meditate key with correct framing line', () => {
    expect(VERSE_FRAMINGS.meditate).toBe('Return to these words whenever your mind wanders.')
  })
})
