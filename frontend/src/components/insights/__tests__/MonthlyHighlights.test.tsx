import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MonthlyHighlights } from '../MonthlyHighlights'

const defaultProps = {
  longestStreak: 7,
  badgesEarned: ['first-light', 'week-one', 'prayer-starter'],
  bestDay: {
    formattedDate: 'February 12',
    activityCount: 5,
    mood: 'Thriving',
  },
}

describe('MonthlyHighlights', () => {
  it('renders 3 highlight cards', () => {
    const { container } = render(<MonthlyHighlights {...defaultProps} />)
    const cards = container.querySelectorAll('.rounded-2xl')
    expect(cards).toHaveLength(3)
  })

  it('shows streak value', () => {
    render(<MonthlyHighlights {...defaultProps} />)
    expect(screen.getByText('7 days')).toBeInTheDocument()
  })

  it('shows badge count', () => {
    render(<MonthlyHighlights {...defaultProps} />)
    expect(screen.getByText('3 badges')).toBeInTheDocument()
  })

  it('shows best day info', () => {
    render(<MonthlyHighlights {...defaultProps} />)
    expect(screen.getByText('February 12')).toBeInTheDocument()
    expect(screen.getByText('5 activities, feeling Thriving')).toBeInTheDocument()
  })

  it('shows streak empty state when 0', () => {
    render(<MonthlyHighlights {...defaultProps} longestStreak={0} />)
    expect(screen.getByText('Every day is a new beginning')).toBeInTheDocument()
  })

  it('shows badges empty state when empty', () => {
    render(<MonthlyHighlights {...defaultProps} badgesEarned={[]} />)
    expect(
      screen.getByText('No new badges this month — keep going!'),
    ).toBeInTheDocument()
  })

  it('shows best day empty state when null', () => {
    render(<MonthlyHighlights {...defaultProps} bestDay={null} />)
    expect(
      screen.getByText(/start checking in to see your journey/i),
    ).toBeInTheDocument()
  })

  it('uses encouraging tone (no negative language)', () => {
    render(
      <MonthlyHighlights longestStreak={0} badgesEarned={[]} bestDay={null} />,
    )
    // All empty states should be present and encouraging
    expect(screen.getByText('Every day is a new beginning')).toBeInTheDocument()
    expect(
      screen.getByText('No new badges this month — keep going!'),
    ).toBeInTheDocument()
  })
})
