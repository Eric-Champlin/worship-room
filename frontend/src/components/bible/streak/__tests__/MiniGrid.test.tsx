import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MiniGrid } from '../MiniGrid'
import type { StreakRecord } from '@/types/bible-streak'
import { getTodayLocal, getYesterday } from '@/lib/bible/dateUtils'

const today = getTodayLocal()
const yesterday = getYesterday(today)

const BASE_STREAK: StreakRecord = {
  currentStreak: 3,
  longestStreak: 5,
  lastReadDate: today,
  streakStartDate: getYesterday(getYesterday(today)),
  graceDaysAvailable: 1,
  graceDaysUsedThisWeek: 0,
  lastGraceUsedDate: null,
  weekResetDate: '2026-04-06',
  milestones: [3],
  totalDaysRead: 3,
}

describe('MiniGrid', () => {
  it('renders 7 squares', () => {
    const { container } = render(<MiniGrid streak={BASE_STREAK} />)
    const squares = container.querySelectorAll('[class*="rounded-lg"]')
    expect(squares).toHaveLength(7)
  })

  it('marks read days with bg-primary', () => {
    const { container } = render(<MiniGrid streak={BASE_STREAK} />)
    const primarySquares = container.querySelectorAll('.bg-primary')
    expect(primarySquares.length).toBeGreaterThan(0)
  })

  it('marks grace day with ring-warning', () => {
    const streakWithGrace: StreakRecord = {
      ...BASE_STREAK,
      currentStreak: 3,
      lastReadDate: today,
      lastGraceUsedDate: today, // grace was used today
      graceDaysUsedThisWeek: 1,
    }
    const { container } = render(<MiniGrid streak={streakWithGrace} />)
    const graceSquares = container.querySelectorAll('.ring-warning')
    expect(graceSquares.length).toBeGreaterThanOrEqual(1)
  })

  it('marks empty days with border', () => {
    const emptyStreak: StreakRecord = {
      ...BASE_STREAK,
      currentStreak: 1,
      lastReadDate: today,
    }
    const { container } = render(<MiniGrid streak={emptyStreak} />)
    const emptySquares = container.querySelectorAll('.border-white\\/20')
    expect(emptySquares.length).toBeGreaterThan(0)
  })

  it('day labels present', () => {
    render(<MiniGrid streak={BASE_STREAK} />)
    // Should have 7 day labels (some may repeat like T for Tue/Thu)
    const labels = screen.getAllByText(/^[MTWFS]$/)
    expect(labels).toHaveLength(7)
  })

  it('has aria-label for accessibility', () => {
    render(<MiniGrid streak={BASE_STREAK} />)
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Last 7 days reading activity',
    )
  })
})
