import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HallOfFame } from '../HallOfFame'
import type { Challenge } from '@/types/challenges'
import type { ChallengeCalendarInfo } from '@/lib/challenge-calendar'

const mockChallenge: Challenge = {
  id: 'pray40-lenten-journey',
  title: 'Pray40: A Lenten Journey',
  description: 'A 40-day Lenten challenge',
  season: 'lent',
  getStartDate: () => new Date('2025-03-05'),
  durationDays: 40,
  icon: 'Heart',
  themeColor: '#6B21A8',
  dailyContent: [],
  communityGoal: '10,000 prayers',
}

const mockInfo: ChallengeCalendarInfo = {
  status: 'past',
  startDate: new Date('2025-03-05'),
  endDate: new Date('2025-04-13'),
}

describe('HallOfFame', () => {
  it('renders Hall of Fame for past challenges', () => {
    render(
      <HallOfFame pastChallenges={[{ challenge: mockChallenge, info: mockInfo }]} />,
    )
    expect(screen.getByText('Hall of Fame')).toBeInTheDocument()
    expect(screen.getByText('Pray40: A Lenten Journey')).toBeInTheDocument()
  })

  it('does not render when no past challenges', () => {
    const { container } = render(<HallOfFame pastChallenges={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows correct completion count (deterministic)', () => {
    render(
      <HallOfFame pastChallenges={[{ challenge: mockChallenge, info: mockInfo }]} />,
    )
    // 800 + ('pray40-lenten-journey'.length * 53) = 800 + (21 * 53) = 800 + 1113 = 1913
    expect(screen.getByText(/1,913 people completed this/)).toBeInTheDocument()
  })

  it('shows correct year from end date', () => {
    render(
      <HallOfFame pastChallenges={[{ challenge: mockChallenge, info: mockInfo }]} />,
    )
    expect(screen.getByText(/in 2025/)).toBeInTheDocument()
  })

  it('uses 2-column grid', () => {
    render(
      <HallOfFame pastChallenges={[{ challenge: mockChallenge, info: mockInfo }]} />,
    )
    const grid = screen.getByText('Pray40: A Lenten Journey').closest('.grid')
    expect(grid?.className).toContain('sm:grid-cols-2')
  })

  it('section has accessible heading', () => {
    render(
      <HallOfFame pastChallenges={[{ challenge: mockChallenge, info: mockInfo }]} />,
    )
    expect(screen.getByRole('heading', { name: /Hall of Fame/ })).toBeInTheDocument()
  })
})
