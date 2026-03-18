import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { FriendProfile } from '@/types/dashboard'
import { LeaderboardRow } from '../LeaderboardRow'

const mockFriend: FriendProfile = {
  id: 'friend-1',
  displayName: 'Sarah M.',
  avatar: '',
  level: 4,
  levelName: 'Flourishing',
  currentStreak: 45,
  faithPoints: 3200,
  weeklyPoints: 145,
  lastActive: new Date().toISOString(),
}

function renderRow(overrides: Partial<Parameters<typeof LeaderboardRow>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ol>
        <LeaderboardRow
          rank={1}
          friend={mockFriend}
          isCurrentUser={false}
          metric="weekly"
          index={0}
          {...overrides}
        />
      </ol>
    </MemoryRouter>,
  )
}

describe('LeaderboardRow', () => {
  it('shows rank, avatar, name, points', () => {
    renderRow()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    // Points shown in both mobile and desktop spots
    expect(screen.getAllByText('145 pts').length).toBeGreaterThanOrEqual(1)
  })

  it('rank #1 has gold color', () => {
    renderRow({ rank: 1 })
    const rankEl = screen.getByText('1')
    expect(rankEl.className).toContain('text-[#FFD700]')
  })

  it('rank #2 has silver color', () => {
    renderRow({ rank: 2 })
    const rankEl = screen.getByText('2')
    expect(rankEl.className).toContain('text-[#C0C0C0]')
  })

  it('rank #3 has bronze color', () => {
    renderRow({ rank: 3 })
    const rankEl = screen.getByText('3')
    expect(rankEl.className).toContain('text-[#CD7F32]')
  })

  it('current user has border-l-2 border-primary', () => {
    renderRow({ isCurrentUser: true })
    const li = screen.getByRole('listitem')
    expect(li.className).toContain('border-l-2')
    expect(li.className).toContain('border-primary')
  })

  it('current user shows "(You)" suffix', () => {
    renderRow({ isCurrentUser: true })
    expect(screen.getByText('Sarah M. (You)')).toBeInTheDocument()
  })

  it('uses semantic li element', () => {
    renderRow()
    expect(screen.getByRole('listitem')).toBeInTheDocument()
  })

  it('shows all-time points when metric is allTime', () => {
    renderRow({ metric: 'allTime' })
    expect(screen.getAllByText('3200 pts').length).toBeGreaterThanOrEqual(1)
  })

  it('staggered animation respects reduced motion', () => {
    renderRow()
    const li = screen.getByRole('listitem')
    expect(li.className).toContain('motion-safe:animate-fade-in')
  })
})
