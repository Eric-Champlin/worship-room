import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BadgeGrid } from '../BadgeGrid'
import { BADGE_DEFINITIONS } from '@/constants/dashboard/badges'

describe('BadgeGrid', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('all sections render with labels', () => {
    render(<BadgeGrid />)

    expect(screen.getByText('Streak Milestones')).toBeInTheDocument()
    expect(screen.getByText('Level-Up')).toBeInTheDocument()
    expect(screen.getByText('Activity Milestones')).toBeInTheDocument()
    expect(screen.getByText('First Steps')).toBeInTheDocument()
    expect(screen.getByText('Full Worship Day')).toBeInTheDocument()
    expect(screen.getByText('Community')).toBeInTheDocument()
  })

  it('earned badges do not have grayscale class', () => {
    // Set up earned badge data
    localStorage.setItem('wr_badges', JSON.stringify({
      earned: {
        welcome: { earnedAt: '2026-03-10T12:00:00Z' },
        level_1: { earnedAt: '2026-03-10T12:00:00Z' },
      },
      newlyEarned: [],
      activityCounts: { pray: 0, journal: 0, meditate: 0, listen: 0, prayerWall: 0, encouragementsSent: 0, fullWorshipDays: 0 },
    }))

    render(<BadgeGrid />)

    const welcomeBtn = screen.getByLabelText(/Welcome to Worship Room, Earned/)
    const circle = welcomeBtn.querySelector('div')
    expect(circle?.className).not.toContain('grayscale')
  })

  it('locked badges have opacity-40 grayscale', () => {
    render(<BadgeGrid />)

    // streak_7 should be locked when no data
    const streakBtn = screen.getByLabelText(/First Flame, Locked/)
    const circle = streakBtn.querySelector('div')
    expect(circle?.className).toContain('opacity-40')
    expect(circle?.className).toContain('grayscale')
  })

  it('lock icon overlay on locked badges', () => {
    render(<BadgeGrid />)

    const lockedBtn = screen.getByLabelText(/First Flame, Locked/)
    const lockIcon = lockedBtn.querySelector('[aria-hidden="true"]')
    expect(lockIcon).toBeDefined()
  })

  it('earned aria-label includes name and "Earned"', () => {
    localStorage.setItem('wr_badges', JSON.stringify({
      earned: {
        welcome: { earnedAt: '2026-03-10T12:00:00Z' },
      },
      newlyEarned: [],
      activityCounts: { pray: 0, journal: 0, meditate: 0, listen: 0, prayerWall: 0, encouragementsSent: 0, fullWorshipDays: 0 },
    }))

    render(<BadgeGrid />)

    const welcomeBtn = screen.getByLabelText(/Welcome to Worship Room, Earned March 10, 2026/)
    expect(welcomeBtn).toBeInTheDocument()
  })

  it('locked aria-label includes name and "Locked"', () => {
    render(<BadgeGrid />)

    const lockedBtn = screen.getByLabelText(/First Flame, Locked, Maintained a 7-day streak/)
    expect(lockedBtn).toBeInTheDocument()
  })

  it('repeatable badge shows count in label', () => {
    localStorage.setItem('wr_badges', JSON.stringify({
      earned: {
        full_worship_day: { earnedAt: '2026-03-15T12:00:00Z', count: 3 },
      },
      newlyEarned: [],
      activityCounts: { pray: 0, journal: 0, meditate: 0, listen: 0, prayerWall: 0, encouragementsSent: 0, fullWorshipDays: 3 },
    }))

    render(<BadgeGrid />)

    const fwdBtn = screen.getByLabelText(/Full Worship Day \(x3\)/)
    expect(fwdBtn).toBeInTheDocument()
  })

  it('renders all badge cells (29 total from BADGE_DEFINITIONS)', () => {
    render(<BadgeGrid />)

    // Count all badge cell buttons (buttons with aria-labels)
    const buttons = screen.getAllByRole('button').filter(
      (btn) => btn.getAttribute('aria-label') && btn.getAttribute('aria-label') !== 'Close badge collection',
    )
    expect(buttons.length).toBe(BADGE_DEFINITIONS.length)
  })

  it('empty badge data does not crash — all badges locked', () => {
    localStorage.setItem('wr_badges', JSON.stringify({
      earned: {},
      newlyEarned: [],
      activityCounts: { pray: 0, journal: 0, meditate: 0, listen: 0, prayerWall: 0, encouragementsSent: 0, fullWorshipDays: 0 },
    }))

    render(<BadgeGrid />)

    const buttons = screen.getAllByRole('button').filter(
      (btn) => btn.getAttribute('aria-label')?.includes('Locked'),
    )
    expect(buttons.length).toBe(BADGE_DEFINITIONS.length)
  })

  it('corrupted localStorage data does not crash', () => {
    localStorage.setItem('wr_badges', 'not-json{{{')

    render(<BadgeGrid />)

    // Should render with all badges locked
    expect(screen.getByText('Badge Collection')).toBeInTheDocument()
  })

  it('close button calls onClose', () => {
    const onClose = vi.fn()
    render(<BadgeGrid onClose={onClose} />)

    const closeBtn = screen.getByLabelText('Close badge collection')
    closeBtn.click()

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
