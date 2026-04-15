import { describe, expect, it } from 'vitest'

import {
  formatSleepTimerRemaining,
  SLEEP_FADE_DURATION_MS,
  SLEEP_TIMER_PRESETS,
} from '../sleep-timer'

describe('SLEEP_TIMER_PRESETS', () => {
  it('has 8 entries', () => {
    expect(SLEEP_TIMER_PRESETS).toHaveLength(8)
    expect(SLEEP_TIMER_PRESETS.map((p) => p.id)).toEqual([
      '15',
      '30',
      '45',
      '60',
      '90',
      '120',
      'chapter',
      'book',
    ])
  })

  it('has correct durations for timed presets', () => {
    const durations = SLEEP_TIMER_PRESETS.filter((p) => p.type === 'duration').map((p) => ({
      id: p.id,
      durationMs: p.durationMs,
    }))
    expect(durations).toEqual([
      { id: '15', durationMs: 900_000 },
      { id: '30', durationMs: 1_800_000 },
      { id: '45', durationMs: 2_700_000 },
      { id: '60', durationMs: 3_600_000 },
      { id: '90', durationMs: 5_400_000 },
      { id: '120', durationMs: 7_200_000 },
    ])
  })
})

describe('SLEEP_FADE_DURATION_MS', () => {
  it('is 20 seconds', () => {
    expect(SLEEP_FADE_DURATION_MS).toBe(20_000)
  })
})

describe('formatSleepTimerRemaining', () => {
  it('formats seconds only', () => {
    expect(formatSleepTimerRemaining(45_000)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatSleepTimerRemaining(1_800_000)).toBe('30:00')
  })

  it('formats hours', () => {
    expect(formatSleepTimerRemaining(5_400_000)).toBe('1:30:00')
  })

  it('handles zero', () => {
    expect(formatSleepTimerRemaining(0)).toBe('0:00')
  })

  it('handles sub-second by ceiling to 1', () => {
    expect(formatSleepTimerRemaining(500)).toBe('0:01')
  })
})
