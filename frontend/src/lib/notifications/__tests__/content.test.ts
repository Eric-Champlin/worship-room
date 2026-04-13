import { describe, it, expect } from 'vitest'
import { generateDailyVersePayload, generateStreakReminderPayload, hashDate } from '../content'
import type { VotdListEntry } from '@/types/bible-landing'

const SAMPLE_ENTRY: VotdListEntry = {
  ref: 'John 3:16',
  book: 'john',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  theme: 'love',
}

describe('generateDailyVersePayload', () => {
  it('produces correct title from verse reference', () => {
    const payload = generateDailyVersePayload(SAMPLE_ENTRY, 'For God so loved the world.')
    expect(payload.title).toBe('John 3:16')
  })

  it('produces correct body from verse text', () => {
    const payload = generateDailyVersePayload(SAMPLE_ENTRY, 'Short text.')
    expect(payload.body).toBe('Short text.')
  })

  it('truncates body longer than 120 chars', () => {
    const longText = 'A'.repeat(200)
    const payload = generateDailyVersePayload(SAMPLE_ENTRY, longText)
    expect(payload.body).toHaveLength(121) // 120 + ellipsis
    expect(payload.body.endsWith('\u2026')).toBe(true)
  })

  it('does not truncate body exactly 120 chars', () => {
    const exactText = 'B'.repeat(120)
    const payload = generateDailyVersePayload(SAMPLE_ENTRY, exactText)
    expect(payload.body).toBe(exactText)
  })

  it('uses correct tag', () => {
    const payload = generateDailyVersePayload(SAMPLE_ENTRY, 'text')
    expect(payload.tag).toBe('daily-verse')
  })

  it('deep link follows BB-38 URL contract', () => {
    const payload = generateDailyVersePayload(SAMPLE_ENTRY, 'text')
    expect(payload.data.url).toBe('/bible/john/3?verse=16')
  })

  it('deep link works for multi-verse entries', () => {
    const multi: VotdListEntry = { ...SAMPLE_ENTRY, book: 'psalms', chapter: 23, startVerse: 1, endVerse: 6 }
    const payload = generateDailyVersePayload(multi, 'text')
    expect(payload.data.url).toBe('/bible/psalms/23?verse=1')
  })

  it('uses correct icon and badge', () => {
    const payload = generateDailyVersePayload(SAMPLE_ENTRY, 'text')
    expect(payload.icon).toBe('/icons/icon-192.png')
    expect(payload.badge).toBe('/icons/icon-192.png')
  })
})

describe('generateStreakReminderPayload', () => {
  it('uses correct title', () => {
    const payload = generateStreakReminderPayload()
    expect(payload.title).toBe('Still time to read today')
  })

  it('uses correct tag', () => {
    const payload = generateStreakReminderPayload()
    expect(payload.tag).toBe('streak-reminder')
  })

  it('deep links to devotional tab', () => {
    const payload = generateStreakReminderPayload()
    expect(payload.data.url).toBe('/daily?tab=devotional')
  })

  it('body contains no digits (no streak numbers)', () => {
    // Test multiple dates to cover all 3 message variants
    for (const date of ['2026-01-01', '2026-01-02', '2026-01-03', '2026-06-15', '2026-12-25']) {
      const payload = generateStreakReminderPayload(date)
      expect(payload.body).not.toMatch(/\d/)
    }
  })

  it('body contains no exclamation marks', () => {
    for (const date of ['2026-01-01', '2026-01-02', '2026-01-03', '2026-06-15', '2026-12-25']) {
      const payload = generateStreakReminderPayload(date)
      expect(payload.body).not.toContain('!')
    }
  })

  it('rotates messages deterministically based on date', () => {
    const bodies = new Set<string>()
    // Try enough dates to see all 3 variants
    for (let d = 1; d <= 10; d++) {
      const date = `2026-01-${String(d).padStart(2, '0')}`
      const payload = generateStreakReminderPayload(date)
      bodies.add(payload.body)
    }
    expect(bodies.size).toBe(3)
  })

  it('same date always produces same message', () => {
    const a = generateStreakReminderPayload('2026-04-12')
    const b = generateStreakReminderPayload('2026-04-12')
    expect(a.body).toBe(b.body)
  })
})

describe('hashDate', () => {
  it('returns a number', () => {
    expect(typeof hashDate('2026-01-01')).toBe('number')
  })

  it('is deterministic', () => {
    expect(hashDate('2026-04-12')).toBe(hashDate('2026-04-12'))
  })

  it('different dates produce different hashes', () => {
    expect(hashDate('2026-01-01')).not.toBe(hashDate('2026-01-02'))
  })
})
