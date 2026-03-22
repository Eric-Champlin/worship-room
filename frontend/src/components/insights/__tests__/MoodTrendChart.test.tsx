import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MoodTrendChart, computeMovingAverage } from '../MoodTrendChart'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'
import type { MoodChartDataPoint } from '@/hooks/useMoodChartData'

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return getLocalDateString(d)
}

function makeMoodEntry(overrides: Partial<MoodEntry> = {}): MoodEntry {
  return {
    id: `test-${Math.random()}`,
    date: getLocalDateString(),
    mood: 4,
    moodLabel: 'Good',
    text: '',
    timestamp: Date.now(),
    verseSeen: 'Psalm 107:1',
    ...overrides,
  }
}

function seedEntries(entries: MoodEntry[]) {
  localStorage.setItem('wr_mood_entries', JSON.stringify(entries))
}

describe('MoodTrendChart', () => {
  it('renders chart when mood data exists', () => {
    seedEntries([
      makeMoodEntry({ date: daysAgo(0), mood: 4, moodLabel: 'Good' }),
      makeMoodEntry({ date: daysAgo(1), mood: 3, moodLabel: 'Okay' }),
    ])
    render(<MoodTrendChart rangeDays={30} />)
    expect(
      screen.getByRole('img', { name: /your mood trend/i }),
    ).toBeInTheDocument()
  })

  it('chart height responsive classes present', () => {
    seedEntries([makeMoodEntry({ date: daysAgo(0) })])
    render(<MoodTrendChart rangeDays={30} />)
    const chart = screen.getByRole('img', { name: /your mood trend/i })
    expect(chart.className).toContain('h-[220px]')
    expect(chart.className).toContain('sm:h-[250px]')
    expect(chart.className).toContain('lg:h-[280px]')
  })

  it('renders empty state when no data', () => {
    render(<MoodTrendChart rangeDays={30} />)
    expect(
      screen.getByText('Start checking in to see your mood trend'),
    ).toBeInTheDocument()
  })

  it('sr-only summary includes check-in count', () => {
    seedEntries([
      makeMoodEntry({ date: daysAgo(0), mood: 4, moodLabel: 'Good' }),
      makeMoodEntry({ date: daysAgo(1), mood: 3, moodLabel: 'Okay' }),
    ])
    render(<MoodTrendChart rangeDays={30} />)
    expect(
      screen.getByText(/2 check-ins over 30 days/),
    ).toBeInTheDocument()
  })

  it('moving average toggle is off by default', () => {
    seedEntries([makeMoodEntry({ date: daysAgo(0) })])
    render(<MoodTrendChart rangeDays={30} />)
    const toggle = screen.getByRole('button', { name: /7-day average/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggling moving average on changes button state', async () => {
    const user = userEvent.setup()
    seedEntries([makeMoodEntry({ date: daysAgo(0) })])
    render(<MoodTrendChart rangeDays={30} />)
    const toggle = screen.getByRole('button', { name: /7-day average/i })

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('section title shows Mood Over Time', () => {
    render(<MoodTrendChart rangeDays={30} />)
    expect(
      screen.getByRole('heading', { name: 'Mood Over Time' }),
    ).toBeInTheDocument()
  })
})

describe('computeMovingAverage', () => {
  it('handles nulls in window', () => {
    const data: MoodChartDataPoint[] = [
      { date: '2026-03-01', dayLabel: 'Mon', mood: 4, moodLabel: 'Good', color: '#2DD4BF', eveningMood: null, eveningMoodLabel: null, eveningColor: null },
      { date: '2026-03-02', dayLabel: 'Tue', mood: null, moodLabel: null, color: null, eveningMood: null, eveningMoodLabel: null, eveningColor: null },
      { date: '2026-03-03', dayLabel: 'Wed', mood: null, moodLabel: null, color: null, eveningMood: null, eveningMoodLabel: null, eveningColor: null },
      { date: '2026-03-04', dayLabel: 'Thu', mood: 2, moodLabel: 'Heavy', color: '#C2703E', eveningMood: null, eveningMoodLabel: null, eveningColor: null },
    ]
    const result = computeMovingAverage(data)

    // First point: avg of [4] = 4
    expect(result[0].movingAvg).toBe(4)
    // Second point: avg of [4] (only valid) = 4
    expect(result[1].movingAvg).toBe(4)
    // Third: avg of [4] = 4
    expect(result[2].movingAvg).toBe(4)
    // Fourth: avg of [4, 2] = 3
    expect(result[3].movingAvg).toBe(3)
  })

  it('returns null when all values in window are null', () => {
    const data: MoodChartDataPoint[] = [
      { date: '2026-03-01', dayLabel: 'Mon', mood: null, moodLabel: null, color: null, eveningMood: null, eveningMoodLabel: null, eveningColor: null },
      { date: '2026-03-02', dayLabel: 'Tue', mood: null, moodLabel: null, color: null, eveningMood: null, eveningMoodLabel: null, eveningColor: null },
    ]
    const result = computeMovingAverage(data)
    expect(result[0].movingAvg).toBeNull()
    expect(result[1].movingAvg).toBeNull()
  })
})
