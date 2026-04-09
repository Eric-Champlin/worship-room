import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StreakDetailModal } from '../StreakDetailModal'
import type { StreakRecord } from '@/types/bible-streak'
import { getTodayLocal } from '@/lib/bible/dateUtils'

const today = getTodayLocal()

const BASE_STREAK: StreakRecord = {
  currentStreak: 14,
  longestStreak: 14,
  lastReadDate: today,
  streakStartDate: '2026-03-27',
  graceDaysAvailable: 1,
  graceDaysUsedThisWeek: 0,
  lastGraceUsedDate: null,
  weekResetDate: '2026-04-06',
  milestones: [3, 7, 14],
  totalDaysRead: 14,
}

describe('StreakDetailModal', () => {
  it('renders title and close button', () => {
    render(<StreakDetailModal isOpen={true} onClose={vi.fn()} streak={BASE_STREAK} atRisk={false} />)
    expect(screen.getByText('Reading streak')).toBeInTheDocument()
    expect(screen.getByLabelText('Close streak details')).toBeInTheDocument()
  })

  it('shows big streak number', () => {
    const { container } = render(
      <StreakDetailModal isOpen={true} onClose={vi.fn()} streak={BASE_STREAK} atRisk={false} />,
    )
    const bigNumber = container.querySelector('.text-5xl')
    expect(bigNumber).toBeInTheDocument()
    expect(bigNumber?.textContent).toBe('14')
  })

  it('subtitle active streak', () => {
    render(<StreakDetailModal isOpen={true} onClose={vi.fn()} streak={BASE_STREAK} atRisk={false} />)
    expect(screen.getByText("You've read 14 days in a row.")).toBeInTheDocument()
  })

  it('subtitle grace used', () => {
    const graceStreak: StreakRecord = {
      ...BASE_STREAK,
      lastGraceUsedDate: today,
      graceDaysUsedThisWeek: 1,
    }
    render(<StreakDetailModal isOpen={true} onClose={vi.fn()} streak={graceStreak} atRisk={false} />)
    expect(screen.getByText('You used your grace day. Your streak is safe.')).toBeInTheDocument()
  })

  it('subtitle at-risk', () => {
    render(<StreakDetailModal isOpen={true} onClose={vi.fn()} streak={BASE_STREAK} atRisk={true} />)
    expect(screen.getByText('Read today to keep your streak alive.')).toBeInTheDocument()
  })

  it('stats row', () => {
    render(<StreakDetailModal isOpen={true} onClose={vi.fn()} streak={BASE_STREAK} atRisk={false} />)
    expect(screen.getByText('Current streak')).toBeInTheDocument()
    expect(screen.getByText('Longest ever')).toBeInTheDocument()
    expect(screen.getByText('Total days read')).toBeInTheDocument()
  })

  it('grace available indicator', () => {
    render(<StreakDetailModal isOpen={true} onClose={vi.fn()} streak={BASE_STREAK} atRisk={false} />)
    expect(screen.getByText('Grace day available')).toBeInTheDocument()
  })

  it('grace used indicator', () => {
    const usedStreak: StreakRecord = {
      ...BASE_STREAK,
      graceDaysUsedThisWeek: 1,
    }
    render(<StreakDetailModal isOpen={true} onClose={vi.fn()} streak={usedStreak} atRisk={false} />)
    expect(screen.getByText(/Grace day used/)).toBeInTheDocument()
  })

  it('footer caption', () => {
    render(<StreakDetailModal isOpen={true} onClose={vi.fn()} streak={BASE_STREAK} atRisk={false} />)
    expect(
      screen.getByText(/Streaks help, but they aren't the point/),
    ).toBeInTheDocument()
  })

  it('closes on backdrop click', () => {
    const onClose = vi.fn()
    const { container } = render(
      <StreakDetailModal isOpen={true} onClose={onClose} streak={BASE_STREAK} atRisk={false} />,
    )
    // Click the outer fixed container (backdrop wrapper)
    const backdrop = container.querySelector('.fixed')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on X button', () => {
    const onClose = vi.fn()
    render(<StreakDetailModal isOpen={true} onClose={onClose} streak={BASE_STREAK} atRisk={false} />)
    fireEvent.click(screen.getByLabelText('Close streak details'))
    expect(onClose).toHaveBeenCalled()
  })

  it('has role="dialog"', () => {
    render(<StreakDetailModal isOpen={true} onClose={vi.fn()} streak={BASE_STREAK} atRisk={false} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('returns null when not open', () => {
    const { container } = render(
      <StreakDetailModal isOpen={false} onClose={vi.fn()} streak={BASE_STREAK} atRisk={false} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
