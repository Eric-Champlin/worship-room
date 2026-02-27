import { describe, it, expect, vi, afterEach } from 'vitest'
import { timeAgo, formatFullDate } from '../time'

describe('timeAgo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns "just now" for dates less than a minute ago', () => {
    const now = new Date('2026-02-26T12:00:00Z')
    vi.setSystemTime(now)
    expect(timeAgo('2026-02-26T11:59:30Z')).toBe('just now')
  })

  it('returns minutes ago for dates less than an hour ago', () => {
    const now = new Date('2026-02-26T12:00:00Z')
    vi.setSystemTime(now)
    expect(timeAgo('2026-02-26T11:45:00Z')).toBe('15 minutes ago')
  })

  it('returns "1 minute ago" for singular', () => {
    const now = new Date('2026-02-26T12:01:00Z')
    vi.setSystemTime(now)
    expect(timeAgo('2026-02-26T12:00:00Z')).toBe('1 minute ago')
  })

  it('returns hours ago for dates less than a day ago', () => {
    const now = new Date('2026-02-26T12:00:00Z')
    vi.setSystemTime(now)
    expect(timeAgo('2026-02-26T09:00:00Z')).toBe('3 hours ago')
  })

  it('returns "1 hour ago" for singular', () => {
    const now = new Date('2026-02-26T12:00:00Z')
    vi.setSystemTime(now)
    expect(timeAgo('2026-02-26T11:00:00Z')).toBe('1 hour ago')
  })

  it('returns days ago for dates less than a week ago', () => {
    const now = new Date('2026-02-26T12:00:00Z')
    vi.setSystemTime(now)
    expect(timeAgo('2026-02-23T12:00:00Z')).toBe('3 days ago')
  })

  it('returns weeks ago for dates less than a month ago', () => {
    const now = new Date('2026-02-26T12:00:00Z')
    vi.setSystemTime(now)
    expect(timeAgo('2026-02-12T12:00:00Z')).toBe('2 weeks ago')
  })

  it('returns months ago for dates less than a year ago', () => {
    const now = new Date('2026-02-26T12:00:00Z')
    vi.setSystemTime(now)
    expect(timeAgo('2025-12-26T12:00:00Z')).toBe('2 months ago')
  })

  it('returns years ago for old dates', () => {
    const now = new Date('2026-02-26T12:00:00Z')
    vi.setSystemTime(now)
    expect(timeAgo('2024-02-26T12:00:00Z')).toBe('2 years ago')
  })
})

describe('formatFullDate', () => {
  it('formats date as "Feb 24, 2026"', () => {
    expect(formatFullDate('2026-02-24T14:30:00Z')).toBe('Feb 24, 2026')
  })

  it('formats a different date correctly', () => {
    expect(formatFullDate('2025-12-01T12:00:00Z')).toBe('Dec 1, 2025')
  })

  it('formats January date correctly', () => {
    expect(formatFullDate('2026-01-15T10:00:00Z')).toBe('Jan 15, 2026')
  })
})
