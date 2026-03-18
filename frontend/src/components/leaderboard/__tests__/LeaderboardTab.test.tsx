import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { FRIENDS_KEY } from '@/services/friends-storage'
import type { FriendsData, FriendProfile } from '@/types/dashboard'
import { LeaderboardTab } from '../LeaderboardTab'

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
    id: 'friend-1',
    displayName: 'Sarah M.',
    avatar: '',
    level: 4,
    levelName: 'Flourishing',
    currentStreak: 45,
    faithPoints: 3200,
    weeklyPoints: 145,
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
        <LeaderboardTab />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('LeaderboardTab', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders board selector', () => {
    seedFriends()
    renderComponent()
    expect(screen.getByRole('tab', { name: 'Friends' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Global' })).toBeInTheDocument()
  })

  it('defaults to Friends board', () => {
    seedFriends()
    renderComponent()
    const friendsTab = screen.getByRole('tab', { name: 'Friends' })
    expect(friendsTab).toHaveAttribute('aria-selected', 'true')
    // Friends board content visible (time toggle)
    expect(screen.getByRole('radio', { name: 'This Week' })).toBeInTheDocument()
  })

  it('switching to Global shows Global board', async () => {
    const user = userEvent.setup()
    seedFriends()
    renderComponent()

    await user.click(screen.getByRole('tab', { name: 'Global' }))

    // Global board content visible (no time toggle, has global leaderboard list)
    expect(screen.getByRole('list', { name: 'Global leaderboard' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'This Week' })).not.toBeInTheDocument()
  })

  it('content wrapped in frosted glass card', () => {
    seedFriends()
    const { container } = renderComponent()
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('bg-white/5')
    expect(card.className).toContain('border-white/10')
    expect(card.className).toContain('rounded-2xl')
  })
})
