import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CalendarHeatmap } from '../CalendarHeatmap'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'

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

describe('CalendarHeatmap', () => {
  it('renders correct number of squares for 30d range', () => {
    render(<CalendarHeatmap rangeDays={30} />)
    // Grid has squares with aria-labels
    const squares = screen.getAllByLabelText(/: /)
    // Should be at least 30 squares (may be slightly more due to week alignment)
    expect(squares.length).toBeGreaterThanOrEqual(30)
  })

  it('squares colored by mood value', () => {
    const entries = [
      makeMoodEntry({ date: daysAgo(1), mood: 4, moodLabel: 'Good' }),
      makeMoodEntry({ date: daysAgo(2), mood: 1, moodLabel: 'Struggling' }),
    ]
    seedEntries(entries)

    render(<CalendarHeatmap rangeDays={30} />)

    const goodSquare = screen.getByLabelText(
      new RegExp(`${formatDate(daysAgo(1))}: Good`),
    )
    expect(goodSquare).toHaveStyle({ backgroundColor: '#2DD4BF' })

    const strugglingSquare = screen.getByLabelText(
      new RegExp(`${formatDate(daysAgo(2))}: Struggling`),
    )
    expect(strugglingSquare).toHaveStyle({ backgroundColor: '#D97706' })
  })

  it('empty days use transparent bg class', () => {
    render(<CalendarHeatmap rangeDays={30} />)
    const noCheckinSquares = screen.getAllByLabelText(/No check-in/)
    expect(noCheckinSquares.length).toBeGreaterThan(0)
    // Should have bg-white/[0.04] class
    noCheckinSquares.forEach((sq) => {
      expect(sq.className).toContain('bg-white/[0.04]')
    })
  })

  it('day labels show Mon, Wed, Fri', () => {
    render(<CalendarHeatmap rangeDays={30} />)
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
  })

  it('month labels appear', () => {
    render(<CalendarHeatmap rangeDays={90} />)
    // At least one month abbreviation should be present
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const foundMonth = months.some((m) => screen.queryByText(m))
    expect(foundMonth).toBe(true)
  })

  it('aria-label on each square', () => {
    const entries = [
      makeMoodEntry({ date: daysAgo(0), mood: 5, moodLabel: 'Thriving' }),
    ]
    seedEntries(entries)

    render(<CalendarHeatmap rangeDays={7} />)

    const todayLabel = formatDate(daysAgo(0))
    expect(
      screen.getByLabelText(new RegExp(`${todayLabel}: Thriving`)),
    ).toBeInTheDocument()
  })

  it('sr-only summary text', () => {
    const entries = [
      makeMoodEntry({ date: daysAgo(0), mood: 4, moodLabel: 'Good' }),
      makeMoodEntry({ date: daysAgo(1), mood: 3, moodLabel: 'Okay' }),
    ]
    seedEntries(entries)

    render(<CalendarHeatmap rangeDays={30} />)
    expect(
      screen.getByText(/2 days with check-ins out of \d+ days/),
    ).toBeInTheDocument()
  })

  it('renders empty state (all transparent squares) when no data', () => {
    render(<CalendarHeatmap rangeDays={30} />)
    const noCheckinSquares = screen.getAllByLabelText(/No check-in/)
    const allSquares = screen.getAllByLabelText(/: /)
    expect(noCheckinSquares.length).toBe(allSquares.length)
  })

  it('tooltip shows on hover', () => {
    const entries = [
      makeMoodEntry({ date: daysAgo(0), mood: 4, moodLabel: 'Good' }),
    ]
    seedEntries(entries)

    render(<CalendarHeatmap rangeDays={7} />)
    const todayLabel = formatDate(daysAgo(0))
    const square = screen.getByLabelText(new RegExp(`${todayLabel}: Good`))

    fireEvent.mouseEnter(square)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Good')
  })

  it('horizontal scroll enabled for large ranges', () => {
    render(<CalendarHeatmap rangeDays={180} />)
    // The container should have overflow-x-auto
    const scrollContainer = document.querySelector('.overflow-x-auto')
    expect(scrollContainer).toBeInTheDocument()
  })
})

// Helper to format date like aria-label does
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}
