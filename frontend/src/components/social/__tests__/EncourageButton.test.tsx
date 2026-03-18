import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EncourageButton } from '../EncourageButton'
import {
  SOCIAL_KEY,
  NOTIFICATIONS_KEY,
} from '@/services/social-storage'
import { MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY } from '@/constants/dashboard/encouragements'

const FRIEND_ID = 'friend-sarah-m'
const FRIEND_NAME = 'Sarah M.'
const MOCK_USER = { name: 'Eric', id: 'user-1' }

const mockShowToast = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: MOCK_USER,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
    showCelebrationToast: vi.fn(),
  }),
}))

function renderButton(props: { iconOnly?: boolean; friendId?: string; friendName?: string } = {}) {
  return render(
    <MemoryRouter>
      <EncourageButton
        friendId={props.friendId ?? FRIEND_ID}
        friendName={props.friendName ?? FRIEND_NAME}
        iconOnly={props.iconOnly}
      />
    </MemoryRouter>,
  )
}

function seedEncouragements(count: number) {
  const data = {
    encouragements: Array.from({ length: count }, (_, i) => ({
      id: `enc-${i}`,
      fromUserId: MOCK_USER.id,
      toUserId: FRIEND_ID,
      message: 'Keep going!',
      timestamp: new Date().toISOString(),
    })),
    nudges: [],
    recapDismissals: [],
  }
  localStorage.setItem(SOCIAL_KEY, JSON.stringify(data))
}

function resetState() {
  cleanup()
  localStorage.clear()
  mockShowToast.mockClear()
}

describe('EncourageButton rendering', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('renders with heart icon and text', () => {
    renderButton()
    const button = screen.getByRole('button', { name: /encourage sarah m/i })
    expect(button).toBeInTheDocument()
    expect(button.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('Encourage')).toBeInTheDocument()
  })

  it('renders icon-only when iconOnly prop is true', () => {
    renderButton({ iconOnly: true })
    const button = screen.getByRole('button', { name: /encourage sarah m/i })
    expect(button).toBeInTheDocument()
    expect(button.querySelector('svg')).toBeInTheDocument()
    expect(screen.queryByText('Encourage')).not.toBeInTheDocument()
  })
})

describe('EncourageButton disabled state', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('button is disabled after 3 encouragements today', () => {
    seedEncouragements(MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY)
    renderButton()
    const button = screen.getByRole('button', { name: /encouraged.*3 times/i })
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('disabled button shows title text', () => {
    seedEncouragements(MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY)
    renderButton()
    const button = screen.getByRole('button', { name: /encouraged.*3 times/i })
    expect(button).toHaveAttribute('title', expect.stringContaining('3 times today'))
  })
})

describe('EncourageButton popover behavior', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('opens popover on click', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: /encourage sarah m/i }))
    expect(screen.getByRole('menu', { name: /encourage sarah m/i })).toBeInTheDocument()
  })

  it('popover shows 4 preset messages', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: /encourage sarah m/i }))
    const menu = screen.getByRole('menu')
    const items = within(menu).getAllByRole('menuitem')
    expect(items).toHaveLength(4)
    expect(screen.getByText('Praying for you')).toBeInTheDocument()
    expect(screen.getByText('Keep going!')).toBeInTheDocument()
    expect(screen.getByText('Proud of you')).toBeInTheDocument()
    expect(screen.getByText('Thinking of you')).toBeInTheDocument()
  })

  it('popover closes on Escape', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: /encourage sarah m/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('popover closes on outside click', async () => {
    const user = userEvent.setup()
    const { container } = renderButton()
    await user.click(screen.getByRole('button', { name: /encourage sarah m/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.click(container)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('popover has role="menu" and items have role="menuitem"', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: /encourage sarah m/i }))
    const menu = screen.getByRole('menu')
    expect(menu).toBeInTheDocument()
    const items = within(menu).getAllByRole('menuitem')
    expect(items).toHaveLength(4)
  })

  it('first item auto-focused on open', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: /encourage sarah m/i }))
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem')
    expect(items[0]).toHaveFocus()
  })

  it('keyboard navigation: arrow keys + Enter selects', async () => {
    // Use a different friend to avoid localStorage contamination
    const user = userEvent.setup()
    renderButton({ friendId: 'friend-kb-test', friendName: 'KB Test' })
    await user.click(screen.getByRole('button', { name: /encourage kb test/i }))
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem')
    expect(items[0]).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(items[1]).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(mockShowToast).toHaveBeenCalled()
  })

  it('popover uses motion-safe prefix for animation', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: /encourage sarah m/i }))
    const menu = screen.getByRole('menu')
    expect(menu.className).toContain('motion-safe:')
  })
})

describe('EncourageButton send flow', () => {
  beforeEach(() => {
    resetState()
    // Seed friend data so sendEncouragement validates the friend exists
    const friendsData = {
      friends: [{ id: FRIEND_ID, displayName: FRIEND_NAME, avatar: '', level: 4, levelName: 'Flourishing', currentStreak: 45, faithPoints: 3200, weeklyPoints: 145, lastActive: new Date().toISOString() }],
      pendingIncoming: [],
      pendingOutgoing: [],
      blocked: [],
    }
    localStorage.setItem('wr_friends', JSON.stringify(friendsData))
  })
  afterEach(resetState)

  it('selecting a preset closes popover, stores data, creates notification, and shows toast', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: /encourage sarah m/i }))
    await user.click(screen.getByText('Praying for you'))

    // Popover closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    // Toast shown
    expect(mockShowToast).toHaveBeenCalledWith(
      'Encouragement sent to Sarah M.!',
      'success',
    )

    // Stored in wr_social_interactions
    const data = JSON.parse(localStorage.getItem(SOCIAL_KEY)!)
    expect(data.encouragements.length).toBeGreaterThanOrEqual(1)
    const last = data.encouragements[data.encouragements.length - 1]
    expect(last.toUserId).toBe(FRIEND_ID)
    expect(last.message).toBe('Praying for you')

    // Notification created in wr_notifications
    const notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)!)
    expect(notifications.length).toBeGreaterThanOrEqual(1)
    const lastNotif = notifications[notifications.length - 1]
    expect(lastNotif.type).toBe('encouragement')
    expect(lastNotif.read).toBe(false)
  })
})

describe('FriendRow EncourageButton integration', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('FriendRow renders EncourageButton', async () => {
    const { FriendRow } = await import('@/components/friends/FriendRow')
    const friend = {
      id: FRIEND_ID,
      displayName: FRIEND_NAME,
      avatar: '',
      level: 4,
      levelName: 'Flourishing',
      currentStreak: 45,
      faithPoints: 3200,
      weeklyPoints: 145,
      lastActive: new Date().toISOString(),
    }
    render(
      <MemoryRouter>
        <FriendRow friend={friend} onRemove={vi.fn()} onBlock={vi.fn()} />
      </MemoryRouter>,
    )
    const buttons = screen.getAllByRole('button')
    const encourageButton = buttons.find(
      (btn) =>
        btn.getAttribute('aria-label')?.toLowerCase().includes('encourage') ||
        btn.getAttribute('aria-label')?.toLowerCase().includes('encouraged'),
    )
    expect(encourageButton).toBeTruthy()
  })
})
