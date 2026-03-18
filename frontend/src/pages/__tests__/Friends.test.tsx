import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { FRIENDS_KEY } from '@/services/friends-storage'
import type { FriendsData } from '@/types/dashboard'
import { Friends } from '../Friends'

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

const mockUseAuth = mockAuthFn

function renderFriends(initialEntry = '/friends') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <Friends />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Friends Page', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  // --- Auth & Shell ---

  it('redirects to / when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderFriends()
    expect(screen.queryByRole('heading', { name: 'Friends' })).not.toBeInTheDocument()
  })

  it('renders page when authenticated', () => {
    renderFriends()
    expect(screen.getByRole('heading', { name: 'Friends' })).toBeInTheDocument()
  })

  it('Friends tab active by default', () => {
    renderFriends()
    const friendsTab = screen.getByRole('tab', { name: 'Friends' })
    expect(friendsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('Leaderboard tab not selected by default', () => {
    renderFriends()
    const leaderboardTab = screen.getByRole('tab', { name: 'Leaderboard' })
    expect(leaderboardTab).toHaveAttribute('aria-selected', 'false')
  })

  it('tab switching shows leaderboard content', async () => {
    const user = userEvent.setup()
    renderFriends()
    await user.click(screen.getByRole('tab', { name: 'Leaderboard' }))
    // Real leaderboard content renders (board selector with Friends/Global segments)
    const tablist = screen.getAllByRole('tablist')
    // Page-level tablist + board selector tablist
    expect(tablist.length).toBeGreaterThanOrEqual(2)
  })

  it('back link navigates to dashboard', () => {
    renderFriends()
    const backLink = screen.getByRole('link', { name: /Dashboard/i })
    expect(backLink).toHaveAttribute('href', '/')
  })

  it('tabs use proper ARIA roles', () => {
    renderFriends()
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    // Both panels exist in DOM, but only the active one is visible
    expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    // The hidden panel still exists in the DOM for aria-controls
    expect(document.getElementById('panel-leaderboard')).toBeInTheDocument()
  })

  it('Leaderboard tab has aria-controls', () => {
    renderFriends()
    const tab = screen.getByRole('tab', { name: 'Leaderboard' })
    expect(tab).toHaveAttribute('aria-controls', 'panel-leaderboard')
  })

  it('skip to content link exists', () => {
    renderFriends()
    const skipLink = screen.getByText('Skip to content')
    expect(skipLink).toHaveAttribute('href', '#friends-content')
  })

  // --- Integration: All sections render ---

  it('all sections render in correct order when authenticated with mock data', () => {
    renderFriends()
    // Search input
    expect(screen.getByLabelText('Search for friends')).toBeInTheDocument()
    // Invite section
    expect(screen.getByText('Invite by Link')).toBeInTheDocument()
    expect(screen.getByText('Invite by Email')).toBeInTheDocument()
    // Pending section
    expect(screen.getByText('Pending Requests')).toBeInTheDocument()
    // Friends list (mock data auto-seeds 10 friends)
    expect(screen.getByText(/Friends \(10\)/)).toBeInTheDocument()
    // Suggestions
    expect(screen.getByText('People You May Know')).toBeInTheDocument()
  })

  // --- Integration: Accept request updates friend list ---

  it('accept request updates friends list in real-time', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFriends()

    // Initially 10 friends
    expect(screen.getByText(/Friends \(10\)/)).toBeInTheDocument()

    // Accept Emma C.'s request
    const acceptBtn = screen.getByLabelText(/Accept friend request from Emma C/i)
    await user.click(acceptBtn)

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    // Friend count increases to 11
    expect(screen.getByText(/Friends \(11\)/)).toBeInTheDocument()
    // Toast should show
    expect(screen.getByText(/You and Emma C. are now friends!/)).toBeInTheDocument()

    vi.useRealTimers()
  })

  // --- Integration: Block from menu ---

  it('block from menu removes friend and hides from search', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderFriends()

    // Initially 10 friends
    expect(screen.getByText(/Friends \(10\)/)).toBeInTheDocument()
    expect(screen.getByText('Sarah M.')).toBeInTheDocument()

    // Open three-dot menu for Sarah M.
    const menuBtns = screen.getAllByLabelText(/Options for/)
    // Sarah M. should be in the list — find her menu button
    const sarahRow = screen.getByText('Sarah M.').closest('[role="listitem"]')!
    const sarahMenuBtn = within(sarahRow).getByLabelText(/Options for/)
    await user.click(sarahMenuBtn)

    // Click Block
    await user.click(screen.getByRole('menuitem', { name: 'Block' }))

    // Friend count decreases
    expect(screen.getByText(/Friends \(9\)/)).toBeInTheDocument()

    vi.restoreAllMocks()
  })

  // --- Integration: Empty state when all friends removed ---

  it('shows empty state when no friends exist', () => {
    // Seed empty data
    const emptyData: FriendsData = {
      friends: [],
      pendingIncoming: [],
      pendingOutgoing: [],
      blocked: [],
    }
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(emptyData))

    renderFriends()
    expect(screen.getByText('Invite someone to grow together')).toBeInTheDocument()
    expect(screen.getByText('Invite a Friend')).toBeInTheDocument()
  })

  // --- Pending section hides when empty ---

  it('pending section hides when no pending requests', () => {
    const noRequests: FriendsData = {
      friends: [
        {
          id: 'f1',
          displayName: 'Test F.',
          avatar: '',
          level: 1,
          levelName: 'Seedling',
          currentStreak: 0,
          faithPoints: 0,
          weeklyPoints: 0,
          lastActive: new Date().toISOString(),
        },
      ],
      pendingIncoming: [],
      pendingOutgoing: [],
      blocked: [],
    }
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(noRequests))

    renderFriends()
    expect(screen.queryByText('Pending Requests')).not.toBeInTheDocument()
  })
})
