import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { FRIENDS_KEY } from '@/services/friends-storage'
import type { FriendsData, FriendProfile } from '@/types/dashboard'
import { FriendsLeaderboard } from '../FriendsLeaderboard'

const AUTH_VALUE = {
  isAuthenticated: true,
  user: { name: 'Test User', id: 'test-user-id' },
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => AUTH_VALUE),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => AUTH_VALUE),
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

function renderComponent() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <FriendsLeaderboard />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('FriendsLeaderboard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('ranks by weekly points by default', () => {
    seedFriends()
    renderComponent()
    const list = screen.getByRole('list', { name: 'Friends leaderboard' })
    const items = within(list).getAllByRole('listitem')
    // Maria (170) should be first, then Sarah (145), then James (95), then Test User (0)
    expect(items[0]).toHaveTextContent('Maria L.')
    expect(items[1]).toHaveTextContent('Sarah M.')
    expect(items[2]).toHaveTextContent('James K.')
  })

  it('shows current user highlighted', () => {
    seedFriends()
    renderComponent()
    const list = screen.getByRole('list', { name: 'Friends leaderboard' })
    const items = within(list).getAllByRole('listitem')
    // Current user (0 pts) should be last
    const userRow = items[items.length - 1]
    expect(userRow.className).toContain('border-primary')
    expect(userRow).toHaveTextContent('Test User (You)')
  })

  it('re-ranks on "All Time" toggle', async () => {
    const user = userEvent.setup()
    seedFriends()
    renderComponent()

    await user.click(screen.getByRole('radio', { name: 'All Time' }))

    const list = screen.getByRole('list', { name: 'Friends leaderboard' })
    const items = within(list).getAllByRole('listitem')
    // Sorted by faithPoints: Maria (6500), Sarah (3200), James (850), User (0)
    expect(items[0]).toHaveTextContent('Maria L.')
    expect(items[1]).toHaveTextContent('Sarah M.')
    expect(items[2]).toHaveTextContent('James K.')
  })

  it('shows empty state when no friends', () => {
    seedFriends([])
    renderComponent()
    expect(screen.getByText('Add friends to see your leaderboard')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Invite friends/ })).toHaveAttribute(
      'href',
      '/friends?tab=friends',
    )
  })

  it('rows use semantic ol/li', () => {
    seedFriends()
    renderComponent()
    expect(screen.getByRole('list', { name: 'Friends leaderboard' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items.length).toBeGreaterThanOrEqual(3)
  })

  it('keyboard accessible time toggle', async () => {
    const user = userEvent.setup()
    seedFriends()
    renderComponent()

    const allTimeBtn = screen.getByRole('radio', { name: 'All Time' })
    allTimeBtn.focus()
    await user.keyboard('{Enter}')
    expect(allTimeBtn).toHaveAttribute('aria-checked', 'true')
  })
})
