import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { FriendProfile } from '@/types/dashboard'
import { FriendList } from '../FriendList'

// FriendRow now uses EncourageButton which requires AuthProvider + ToastProvider
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { name: 'Test', id: 'test-user' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    showCelebrationToast: vi.fn(),
  }),
}))

const FRIENDS: FriendProfile[] = [
  {
    id: 'friend-1',
    displayName: 'Sarah M.',
    avatar: '',
    level: 4,
    levelName: 'Flourishing',
    currentStreak: 45,
    faithPoints: 3200,
    weeklyPoints: 145,
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'friend-2',
    displayName: 'James K.',
    avatar: '',
    level: 3,
    levelName: 'Blooming',
    currentStreak: 0,
    faithPoints: 850,
    weeklyPoints: 95,
    lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
]

function renderFriendList(friends: FriendProfile[] = FRIENDS) {
  const onRemove = vi.fn()
  const onBlock = vi.fn()
  const onScrollToInvite = vi.fn()
  const onFocusSearch = vi.fn()

  const result = render(
    <MemoryRouter>
      <FriendList
        friends={friends}
        onRemove={onRemove}
        onBlock={onBlock}
        onScrollToInvite={onScrollToInvite}
        onFocusSearch={onFocusSearch}
      />
    </MemoryRouter>,
  )

  return { ...result, onRemove, onBlock, onScrollToInvite, onFocusSearch }
}

describe('FriendList', () => {
  it('renders all friends with correct data', () => {
    renderFriendList()
    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    expect(screen.getByText('James K.')).toBeInTheDocument()
    expect(screen.getByText('Flourishing')).toBeInTheDocument()
    expect(screen.getByText('Blooming')).toBeInTheDocument()
  })

  it('shows friend count in heading', () => {
    renderFriendList()
    expect(screen.getByText('Friends (2)')).toBeInTheDocument()
  })

  it('friend row is navigable to /profile/:id', () => {
    renderFriendList()
    // FriendRow uses role="link" with useNavigate — verify the row is accessible as a link
    const rows = screen.getAllByRole('link')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('shows streak for friends with active streaks', () => {
    renderFriendList()
    expect(screen.getByText('45')).toBeInTheDocument()
  })

  it('does not show streak of 0', () => {
    renderFriendList()
    // James K. has 0 streak, should not show a streak indicator
    const jamesRow = screen.getByText('James K.').closest('[role="listitem"]')!
    expect(within(jamesRow).queryByText('0')).not.toBeInTheDocument()
  })

  it('three-dot menu opens on click', async () => {
    const user = userEvent.setup()
    renderFriendList()

    const menuButtons = screen.getAllByLabelText(/Options for/)
    await user.click(menuButtons[0])
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Remove Friend' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Block' })).toBeInTheDocument()
  })

  it('remove confirmation calls onRemove', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    const { onRemove } = renderFriendList()

    await user.click(screen.getAllByLabelText(/Options for/)[0])
    await user.click(screen.getByRole('menuitem', { name: 'Remove Friend' }))

    expect(window.confirm).toHaveBeenCalledWith('Remove Sarah M. from friends?')
    expect(onRemove).toHaveBeenCalledWith('friend-1')
    vi.restoreAllMocks()
  })

  it('block confirmation calls onBlock', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    const { onBlock } = renderFriendList()

    await user.click(screen.getAllByLabelText(/Options for/)[0])
    await user.click(screen.getByRole('menuitem', { name: 'Block' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(onBlock).toHaveBeenCalledWith('friend-1')
    vi.restoreAllMocks()
  })

  it('empty state renders when no friends', () => {
    renderFriendList([])
    expect(screen.getByText('Invite someone to grow together')).toBeInTheDocument()
    expect(screen.getByText('Invite a Friend')).toBeInTheDocument()
    expect(screen.getByText('Search for friends')).toBeInTheDocument()
  })

  it('invite CTA calls onScrollToInvite', async () => {
    const user = userEvent.setup()
    const { onScrollToInvite } = renderFriendList([])
    await user.click(screen.getByText('Invite a Friend'))
    expect(onScrollToInvite).toHaveBeenCalled()
  })

  it('menu uses role="menu" with role="menuitem"', async () => {
    const user = userEvent.setup()
    renderFriendList()
    await user.click(screen.getAllByLabelText(/Options for/)[0])
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
  })

  it('three-dot has aria-haspopup="menu"', () => {
    renderFriendList()
    const menuBtns = screen.getAllByLabelText(/Options for/)
    expect(menuBtns[0]).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('list uses role="list" / role="listitem"', () => {
    renderFriendList()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
