import { describe, expect, it } from 'vitest'
import { daysBetween, getISOWeekStart, getTodayLocal, getYesterday } from '../dateUtils'

describe('getTodayLocal', () => {
  it('returns ISO format YYYY-MM-DD', () => {
    const today = getTodayLocal()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('daysBetween', () => {
  it('returns 0 for the same day', () => {
    expect(daysBetween('2026-04-09', '2026-04-09')).toBe(0)
  })

  it('returns 1 for consecutive days', () => {
    expect(daysBetween('2026-04-09', '2026-04-10')).toBe(1)
  })

  it('returns correct count for multi-day gap', () => {
    expect(daysBetween('2026-04-01', '2026-04-09')).toBe(8)
  })

  it('handles year boundary', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
  })
})

describe('getISOWeekStart', () => {
  it('returns previous Monday for a Wednesday', () => {
    // 2026-04-08 is a Wednesday → Monday is 2026-04-06
    expect(getISOWeekStart('2026-04-08')).toBe('2026-04-06')
  })

  it('returns same date when already Monday', () => {
    // 2026-04-06 is a Monday
    expect(getISOWeekStart('2026-04-06')).toBe('2026-04-06')
  })

  it('returns previous Monday for a Sunday', () => {
    // 2026-04-12 is a Sunday → Monday is 2026-04-06
    expect(getISOWeekStart('2026-04-12')).toBe('2026-04-06')
  })

  it('handles year boundary', () => {
    // 2026-01-01 is a Thursday → Monday is 2025-12-29
    expect(getISOWeekStart('2026-01-01')).toBe('2025-12-29')
  })
})

describe('getYesterday', () => {
  it('returns previous day', () => {
    expect(getYesterday('2026-04-09')).toBe('2026-04-08')
  })

  it('handles month boundary', () => {
    expect(getYesterday('2026-04-01')).toBe('2026-03-31')
  })

  it('handles year boundary', () => {
    expect(getYesterday('2026-01-01')).toBe('2025-12-31')
  })
})
