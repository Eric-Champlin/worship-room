import { describe, it, expect } from 'vitest'
import { relativeTime } from '../relative-time'

describe('relativeTime', () => {
  const now = new Date('2026-05-13T12:00:00Z')

  it('returns "just now" for diff < 1 minute', () => {
    const at = new Date('2026-05-13T11:59:45Z')
    expect(relativeTime(at, now)).toBe('just now')
  })

  it('returns "N min ago" for diffs 1-59 minutes', () => {
    expect(relativeTime(new Date('2026-05-13T11:55:00Z'), now)).toBe('5 min ago')
    expect(relativeTime(new Date('2026-05-13T11:01:00Z'), now)).toBe('59 min ago')
  })

  it('returns "1 hour ago" singular vs "N hours ago" plural', () => {
    expect(relativeTime(new Date('2026-05-13T11:00:00Z'), now)).toBe('1 hour ago')
    expect(relativeTime(new Date('2026-05-13T09:00:00Z'), now)).toBe('3 hours ago')
  })

  it('returns "1 day ago" singular vs "N days ago" plural', () => {
    expect(relativeTime(new Date('2026-05-12T12:00:00Z'), now)).toBe('1 day ago')
    expect(relativeTime(new Date('2026-05-08T12:00:00Z'), now)).toBe('5 days ago')
  })

  it('returns "N week(s) ago" for diffs 8-30 days', () => {
    expect(relativeTime(new Date('2026-05-05T12:00:00Z'), now)).toBe('1 week ago')
    expect(relativeTime(new Date('2026-04-22T12:00:00Z'), now)).toBe('3 weeks ago')
  })

  it('returns "in <Month> <Year>" for diffs ≥ 31 days', () => {
    expect(relativeTime(new Date('2025-11-15T12:00:00Z'), now)).toBe(
      'in November 2025',
    )
    expect(relativeTime(new Date('2025-01-05T12:00:00Z'), now)).toBe(
      'in January 2025',
    )
  })
})
