import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_PRAYER_LINES,
  buildEveningPrayer,
  GENERIC_NO_ACTIVITY_LINE,
  MOOD_PRAYER_LINES,
} from '../evening-prayer-builder'

const OPENING = 'Lord, thank you for this day.'
const CLOSING_START = 'As I rest tonight, I trust You with everything I carry.'

const NO_ACTIVITIES: Record<string, boolean> = {
  devotional: false,
  readingPlan: false,
  pray: false,
  journal: false,
  meditate: false,
  prayerWall: false,
  challenge: false,
  gratitude: false,
}

describe('buildEveningPrayer', () => {
  it('returns prayer with activity lines for completed activities', () => {
    const result = buildEveningPrayer({
      todayActivities: { ...NO_ACTIVITIES, devotional: true, pray: true },
      eveningMoodLabel: null,
    })

    expect(result).toContain(ACTIVITY_PRAYER_LINES[0].line) // devotional
    expect(result).toContain(ACTIVITY_PRAYER_LINES[2].line) // pray
  })

  it('respects priority order', () => {
    const result = buildEveningPrayer({
      todayActivities: {
        gratitude: true,
        devotional: true,
        pray: true,
        journal: true,
        meditate: true,
        prayerWall: true,
        challenge: true,
        readingPlan: true,
      },
      eveningMoodLabel: null,
    })

    // First 3 by priority: devotional, readingPlan, pray
    expect(result).toContain(ACTIVITY_PRAYER_LINES[0].line) // devotional
    expect(result).toContain(ACTIVITY_PRAYER_LINES[1].line) // readingPlan
    expect(result).toContain(ACTIVITY_PRAYER_LINES[2].line) // pray

    // 4th+ should NOT appear
    expect(result).not.toContain(ACTIVITY_PRAYER_LINES[3].line) // journal
  })

  it('caps at 3 activity lines', () => {
    const allTrue: Record<string, boolean> = {}
    ACTIVITY_PRAYER_LINES.forEach(({ activity }) => {
      allTrue[activity] = true
    })

    const result = buildEveningPrayer({
      todayActivities: allTrue,
      eveningMoodLabel: null,
    })

    const matchCount = ACTIVITY_PRAYER_LINES.filter(({ line }) =>
      result.includes(line),
    ).length

    expect(matchCount).toBe(3)
  })

  it('uses generic line when no activities completed', () => {
    const result = buildEveningPrayer({
      todayActivities: NO_ACTIVITIES,
      eveningMoodLabel: null,
    })

    expect(result).toContain(GENERIC_NO_ACTIVITY_LINE)
  })

  it.each([
    ['Struggling' as const, MOOD_PRAYER_LINES.Struggling],
    ['Heavy' as const, MOOD_PRAYER_LINES.Heavy],
    ['Okay' as const, MOOD_PRAYER_LINES.Okay],
    ['Good' as const, MOOD_PRAYER_LINES.Good],
    ['Thriving' as const, MOOD_PRAYER_LINES.Thriving],
  ])('includes mood line for %s', (mood, expectedLine) => {
    const result = buildEveningPrayer({
      todayActivities: NO_ACTIVITIES,
      eveningMoodLabel: mood,
    })

    expect(result).toContain(expectedLine)
  })

  it('omits mood line when null', () => {
    const result = buildEveningPrayer({
      todayActivities: NO_ACTIVITIES,
      eveningMoodLabel: null,
    })

    Object.values(MOOD_PRAYER_LINES).forEach((line) => {
      expect(result).not.toContain(line)
    })
    // Prayer should still be valid
    expect(result).toContain(OPENING)
    expect(result).toContain(CLOSING_START)
  })

  it('has correct prayer structure with \\n\\n separators', () => {
    const result = buildEveningPrayer({
      todayActivities: { ...NO_ACTIVITIES, devotional: true },
      eveningMoodLabel: 'Good',
    })

    const sections = result.split('\n\n')
    expect(sections[0]).toBe(OPENING)
    expect(sections[1]).toBe(ACTIVITY_PRAYER_LINES[0].line) // devotional
    expect(sections[2]).toBe(MOOD_PRAYER_LINES.Good)
    expect(sections[3]).toContain(CLOSING_START)
  })

  it('excludes non-spiritual activities and uses generic line', () => {
    const result = buildEveningPrayer({
      todayActivities: { mood: true, reflection: true, listen: true },
      eveningMoodLabel: null,
    })

    // None of these are in ACTIVITY_PRAYER_LINES, so generic line should appear
    expect(result).toContain(GENERIC_NO_ACTIVITY_LINE)
  })
})
