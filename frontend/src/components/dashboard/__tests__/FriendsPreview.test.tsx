import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FriendsPreview } from '../FriendsPreview'
import { FRIENDS_KEY } from '@/services/friends-storage'
import type { FriendsData, FriendProfile } from '@/types/dashboard'

const { mockAuthFn } = vi.hoisted(() => {
  const mockAuthFn = vi.fn(() => ({
    isAuthenticated: true,
    user: { name: 'Test User', id: 'test-user-id' },
    login: vi.fn(),
    logout: vi.fn(),
  }))
  return { mockAuthFn }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockAuthFn,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mockAuthFn,
}))

const MOCK_FRIENDS: FriendProfile[] = [
  {
    id: 'friend-maria',
    displayName: 'Maria L.',
    avatar: '',
    level: 5,
    levelName: 'Oak',
    currentStreak: 90,
    faithPoints: 6500,
    weeklyPoints: 170,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'friend-sarah',
    displayName: 'Sarah M.',
    avatar: '',
    level: 4,
    levelName: 'Flourishing',
    currentStreak: 45,
    faithPoints: 3200,
    weeklyPoints: 145,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'friend-james',
    displayName: 'James K.',
    avatar: '',
    level: 3,
    levelName: 'Blooming',
    currentStreak: 12,
    faithPoints: 850,
    weeklyPoints: 95,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'friend-grace',
    displayName: 'Grace H.',
    avatar: '',
    level: 4,
    levelName: 'Flourishing',
    currentStreak: 60,
    faithPoints: 3800,
    weeklyPoints: 160,
    lastActive: new Date().toISOString(),
  },
]

function seedFriends(friends: FriendProfile[] = MOCK_FRIENDS) {
  const data: FriendsData = {
    friends,
    pendingIncoming: [],
    pendingOutgoing: [],
    blocked: [],
  }
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(data))
}

function renderPreview() {
  return render(
    <MemoryRouter>
      <FriendsPreview />
    </MemoryRouter>,
  )
}

describe('FriendsPreview', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows top 3 friends by weekly points', () => {
    seedFriends()
    renderPreview()
    // Maria (170), Grace (160), Sarah (145) — top 3
    expect(screen.getByText('Maria L.')).toBeInTheDocument()
    expect(screen.getByText('Grace H.')).toBeInTheDocument()
    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
  })

  it('shows rank numbers with correct colors', () => {
    seedFriends()
    renderPreview()
    const rank1 = screen.getByText('#1')
    const rank2 = screen.getByText('#2')
    const rank3 = screen.getByText('#3')
    expect(rank1.className).toContain('text-[#FFD700]')
    expect(rank2.className).toContain('text-[#C0C0C0]')
    expect(rank3.className).toContain('text-[#CD7F32]')
  })

  it('shows current user position when not in top 3', () => {
    seedFriends()
    renderPreview()
    // User has 0 weekly pts, so ranked 5th (behind 4 friends)
    expect(screen.getByText(/You · #5 · 0 pts/)).toBeInTheDocument()
  })

  it('hides user position row when user in top 3', () => {
    // Only 2 friends, user is always in top 3
    seedFriends(MOCK_FRIENDS.slice(0, 2))
    renderPreview()
    // User row should show as "You" in the top 3 list, not a separate row
    expect(screen.queryByText(/You · #/)).not.toBeInTheDocument()
  })

  it('shows milestone feed below rankings', () => {
    seedFriends()
    renderPreview()
    expect(screen.getByText(/Maria L. reached Oak level/)).toBeInTheDocument()
    expect(screen.getByText(/Grace H. earned 7-Day Streak badge/)).toBeInTheDocument()
  })

  it('shows empty state with CTA when no friends', () => {
    seedFriends([])
    renderPreview()
    expect(screen.getByText('Add friends to see your leaderboard')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Invite a friend/i })
    expect(link).toHaveAttribute('href', '/friends?tab=friends')
  })

  it('works with friends who have 0 weekly points', () => {
    const zeroFriends: FriendProfile[] = [
      { ...MOCK_FRIENDS[0], weeklyPoints: 0 },
      { ...MOCK_FRIENDS[1], weeklyPoints: 0 },
    ]
    seedFriends(zeroFriends)
    renderPreview()
    // Should still render (0 pts shown)
    expect(screen.getAllByText('0 pts').length).toBeGreaterThanOrEqual(1)
  })
})
