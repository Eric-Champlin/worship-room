import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getTooltipsSeen, isTooltipSeen, markTooltipSeen } from '../tooltip-storage'

beforeEach(() => {
  localStorage.clear()
})

describe('getTooltipsSeen', () => {
  it('returns empty object when key is absent', () => {
    expect(getTooltipsSeen()).toEqual({})
  })

  it('handles corrupted JSON gracefully', () => {
    localStorage.setItem('wr_tooltips_seen', '{not-valid-json')
    expect(getTooltipsSeen()).toEqual({})
  })
})

describe('isTooltipSeen', () => {
  it('returns false for unseen tooltip', () => {
    expect(isTooltipSeen('dashboard-quick-actions')).toBe(false)
  })

  it('returns true for seen tooltip', () => {
    localStorage.setItem('wr_tooltips_seen', JSON.stringify({ 'dashboard-quick-actions': true }))
    expect(isTooltipSeen('dashboard-quick-actions')).toBe(true)
  })
})

describe('markTooltipSeen', () => {
  it('persists tooltip ID', () => {
    markTooltipSeen('dashboard-quick-actions')
    expect(isTooltipSeen('dashboard-quick-actions')).toBe(true)

    const stored = JSON.parse(localStorage.getItem('wr_tooltips_seen')!)
    expect(stored).toEqual({ 'dashboard-quick-actions': true })
  })

  it('preserves existing seen tooltips', () => {
    markTooltipSeen('dashboard-quick-actions')
    markTooltipSeen('daily-hub-tabs')

    const stored = JSON.parse(localStorage.getItem('wr_tooltips_seen')!)
    expect(stored).toEqual({
      'dashboard-quick-actions': true,
      'daily-hub-tabs': true,
    })
  })

  it('does not throw when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => markTooltipSeen('test')).not.toThrow()
    vi.restoreAllMocks()
  })
})
