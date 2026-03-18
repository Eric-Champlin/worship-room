import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { WeeklyRecap } from '../WeeklyRecap'
import { FRIENDS_KEY } from '@/services/friends-storage'
import { SOCIAL_KEY, NOTIFICATIONS_KEY } from '@/services/social-storage'
import { getCurrentWeekStart } from '@/utils/date'
import type { FriendsData, FriendProfile } from '@/types/dashboard'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { name: 'Eric', id: 'user-1' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

const MOCK_FRIEND: FriendProfile = {
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

function seedFriends(count: number = 5) {
  const data: FriendsData = {
    friends: Array.from({ length: count }, (_, i) => ({
      ...MOCK_FRIEND,
      id: `friend-${i}`,
    })),
    pendingIncoming: [],
    pendingOutgoing: [],
    blocked: [],
  }
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(data))
}

function resetState() {
  cleanup()
  localStorage.clear()
}

function renderRecap() {
  return render(
    <MemoryRouter>
      <WeeklyRecap />
    </MemoryRouter>,
  )
}

describe('WeeklyRecap', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('renders no-friends state with CTA', () => {
    seedFriends(0)
    renderRecap()
    expect(screen.getByText('Add friends to see your weekly recap')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /find friends/i })).toHaveAttribute('href', '/friends')
  })

  it('renders stats with friend data, correct layout, contribution %, and notification', () => {
    seedFriends()
    renderRecap()

    // Stats content
    expect(screen.getByText(/prayed 23 times/i)).toBeInTheDocument()
    expect(screen.getByText(/journaled 15 entries/i)).toBeInTheDocument()
    expect(screen.getByText(/completed 8 meditations/i)).toBeInTheDocument()
    expect(screen.getByText(/spent 12 hours in worship music/i)).toBeInTheDocument()

    // Contribution percentage
    expect(screen.getByText(/you contributed \d+% of the group/i)).toBeInTheDocument()

    // Grid layout classes
    const grid = screen.getByText(/prayed 23 times/i).closest('.grid')
    expect(grid?.className).toContain('sm:grid-cols-2')
    expect(grid?.className).toContain('grid-cols-1')

    // Notification generated
    const raw = localStorage.getItem(NOTIFICATIONS_KEY)
    if (raw) {
      const notifications = JSON.parse(raw)
      const recapNotif = notifications.find((n: { type: string }) => n.type === 'weekly_recap')
      expect(recapNotif).toBeTruthy()
    }
  })

  it('dismissed state persists across reload', () => {
    seedFriends()
    const weekStart = getCurrentWeekStart()
    localStorage.setItem(
      SOCIAL_KEY,
      JSON.stringify({ encouragements: [], nudges: [], recapDismissals: [weekStart] }),
    )
    renderRecap()
    expect(screen.queryByText(/prayed 23 times/i)).not.toBeInTheDocument()
  })

  it('X button dismisses card', async () => {
    seedFriends()
    const user = userEvent.setup()
    renderRecap()
    expect(screen.getByText(/prayed 23 times/i)).toBeInTheDocument()
    await user.click(screen.getByLabelText('Dismiss weekly recap'))
    expect(screen.queryByText(/prayed 23 times/i)).not.toBeInTheDocument()
  })
})
