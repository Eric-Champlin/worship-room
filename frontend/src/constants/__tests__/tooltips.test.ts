import { describe, it, expect } from 'vitest'
import { TOOLTIP_DEFINITIONS } from '../tooltips'

describe('TOOLTIP_DEFINITIONS', () => {
  it('has 4 tooltip definitions', () => {
    expect(Object.keys(TOOLTIP_DEFINITIONS)).toHaveLength(4)
  })

  it('has correct IDs matching keys', () => {
    for (const [key, def] of Object.entries(TOOLTIP_DEFINITIONS)) {
      expect(def.id).toBe(key)
    }
  })

  it('has correct messages', () => {
    expect(TOOLTIP_DEFINITIONS['dashboard-quick-actions'].message).toBe(
      'Start here — pick any practice to begin your day',
    )
    expect(TOOLTIP_DEFINITIONS['daily-hub-tabs'].message).toBe(
      'Switch between Pray, Journal, and Meditate here',
    )
    expect(TOOLTIP_DEFINITIONS['prayer-wall-composer'].message).toBe(
      "Share what's on your heart with the community",
    )
    expect(TOOLTIP_DEFINITIONS['music-ambient-tab'].message).toBe(
      'Mix ambient sounds to create your perfect atmosphere',
    )
  })

  it('has valid position values', () => {
    const validPositions = ['top', 'bottom', 'left', 'right']
    for (const def of Object.values(TOOLTIP_DEFINITIONS)) {
      expect(validPositions).toContain(def.position)
    }
  })
})
