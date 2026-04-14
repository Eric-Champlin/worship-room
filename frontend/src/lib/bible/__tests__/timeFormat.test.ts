import { describe, expect, it } from 'vitest'
import { formatRelativeReadTime } from '../timeFormat'

describe('formatRelativeReadTime', () => {
  // Fixed reference: 2026-04-09 14:00:00 local
  const NOW = new Date(2026, 3, 9, 14, 0, 0).getTime()

  it('returns "Just now" for 0ms ago', () => {
    expect(formatRelativeReadTime(NOW, NOW)).toBe('Just now')
  })

  it('returns "Just now" for 59 minutes ago', () => {
    const ts = NOW - 59 * 60_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('Just now')
  })

  it('returns "1 hours ago" for 60 minutes', () => {
    const ts = NOW - 60 * 60_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('1 hours ago')
  })

  it('returns "5 hours ago" for 5h', () => {
    const ts = NOW - 5 * 3_600_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('5 hours ago')
  })

  it('returns "Earlier today" for 8h same day', () => {
    // 14:00 - 8h = 06:00 same day
    const ts = NOW - 8 * 3_600_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('Earlier today')
  })

  it('returns "This morning" for 20h same day', () => {
    // Use a NOW at 22:00 so 20h ago is 02:00 same calendar day
    const lateNow = new Date(2026, 3, 9, 22, 0, 0).getTime()
    const ts = lateNow - 20 * 3_600_000
    // 22:00 - 20h = 02:00 same day
    expect(formatRelativeReadTime(ts, lateNow)).toBe('This morning')
  })

  it('returns "Yesterday" for previous calendar day', () => {
    // NOW is Apr 9 14:00. Yesterday at 23:59 = Apr 8 23:59
    const yesterday = new Date(2026, 3, 8, 23, 59, 0).getTime()
    expect(formatRelativeReadTime(yesterday, NOW)).toBe('Yesterday')
  })

  it('returns "2 days ago" for 2 days', () => {
    const ts = NOW - 2 * 86_400_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('2 days ago')
  })

  it('returns "6 days ago" for 6 days', () => {
    const ts = NOW - 6 * 86_400_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('6 days ago')
  })

  it('returns "1 week ago" for 7 days', () => {
    const ts = NOW - 7 * 86_400_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('1 week ago')
  })

  it('returns "1 week ago" for 13 days', () => {
    const ts = NOW - 13 * 86_400_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('1 week ago')
  })

  it('returns "2 weeks ago" for 14 days', () => {
    const ts = NOW - 14 * 86_400_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('2 weeks ago')
  })

  it('returns "3 weeks ago" for 27 days', () => {
    const ts = NOW - 27 * 86_400_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('3 weeks ago')
  })

  it('returns "1 month ago" for 28 days', () => {
    const ts = NOW - 28 * 86_400_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('1 month ago')
  })

  it('returns "2 months ago" for 60 days', () => {
    const ts = NOW - 60 * 86_400_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('2 months ago')
  })

  it('returns "Over a year ago" for 365 days', () => {
    const ts = NOW - 365 * 86_400_000
    expect(formatRelativeReadTime(ts, NOW)).toBe('Over a year ago')
  })

  it('accepts optional now parameter', () => {
    const fixed = new Date(2026, 0, 15, 12, 0, 0).getTime()
    const ts = fixed - 2 * 3_600_000
    expect(formatRelativeReadTime(ts, fixed)).toBe('2 hours ago')
  })
})
