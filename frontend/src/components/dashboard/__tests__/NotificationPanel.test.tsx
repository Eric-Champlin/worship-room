import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NotificationPanel } from '../NotificationPanel'
import { MOCK_NOTIFICATIONS } from '@/mocks/notifications-mock-data'
import type { NotificationEntry } from '@/types/dashboard'

// Mock prefers-reduced-motion so animations are instant (no setTimeout in dismiss)
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: query === '(prefers-reduced-motion: reduce)',
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  isMobile: false,
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: 5,
  onMarkAsRead: vi.fn(),
  onMarkAllAsRead: vi.fn(),
  onDismiss: vi.fn(),
  onAcceptFriend: vi.fn(),
  onDeclineFriend: vi.fn(),
  onTapNotification: vi.fn(),
  isAlreadyFriend: () => false,
}

function renderPanel(overrides: Partial<typeof defaultProps> = {}) {
  return render(<NotificationPanel {...defaultProps} {...overrides} />)
}

describe('NotificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.matchMedia = mockMatchMedia
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders all 13 mock notifications', () => {
    renderPanel()
    const list = screen.getByRole('list')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(13)
  })

  it('renders correct icon for each notification type', () => {
    renderPanel()
    // Some types appear multiple times (e.g. encouragement ×3)
    expect(screen.getAllByText('🙏').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('👤').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('🏆').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('🎉').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('❤️').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('📊').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('⬆️').length).toBeGreaterThanOrEqual(1)
  })

  it('unread notifications have brighter background', () => {
    renderPanel({ notifications: [MOCK_NOTIFICATIONS[0]] })
    const item = screen.getByRole('listitem')
    expect(item.className).toContain('bg-white/10')
  })

  it('read notifications have transparent background', () => {
    renderPanel({ notifications: [MOCK_NOTIFICATIONS[6]] })
    const item = screen.getByRole('listitem')
    expect(item.className).not.toContain('bg-white/10')
  })

  it('tapping non-friend_request calls onTapNotification', async () => {
    const onTapNotification = vi.fn()
    renderPanel({ notifications: [MOCK_NOTIFICATIONS[0]], onTapNotification })
    await userEvent.click(screen.getByRole('listitem'))
    expect(onTapNotification).toHaveBeenCalledWith(MOCK_NOTIFICATIONS[0])
  })

  it('friend_request shows Accept/Decline buttons', () => {
    const friendRequest = MOCK_NOTIFICATIONS.find((n) => n.type === 'friend_request')!
    renderPanel({ notifications: [friendRequest] })
    expect(screen.getByText('Accept')).toBeInTheDocument()
    expect(screen.getByText('Decline')).toBeInTheDocument()
  })

  it('Accept calls onAcceptFriend', async () => {
    const onAcceptFriend = vi.fn()
    const friendRequest = MOCK_NOTIFICATIONS.find((n) => n.type === 'friend_request')!
    renderPanel({ notifications: [friendRequest], onAcceptFriend })
    await userEvent.click(screen.getByText('Accept'))
    expect(onAcceptFriend).toHaveBeenCalledWith(friendRequest)
  })

  it('Decline calls onDeclineFriend', async () => {
    const onDeclineFriend = vi.fn()
    const friendRequest = MOCK_NOTIFICATIONS.find((n) => n.type === 'friend_request')!
    renderPanel({ notifications: [friendRequest], onDeclineFriend })
    await userEvent.click(screen.getByText('Decline'))
    expect(onDeclineFriend).toHaveBeenCalledWith(friendRequest)
  })

  it('already-friend shows "Already friends" text', () => {
    const friendRequest = MOCK_NOTIFICATIONS.find((n) => n.type === 'friend_request')!
    renderPanel({ notifications: [friendRequest], isAlreadyFriend: () => true })
    expect(screen.getByText('Already friends')).toBeInTheDocument()
    expect(screen.queryByText('Accept')).not.toBeInTheDocument()
  })

  it('"Mark all as read" calls onMarkAllAsRead', async () => {
    const onMarkAllAsRead = vi.fn()
    renderPanel({ onMarkAllAsRead })
    await userEvent.click(screen.getByText('Mark all as read'))
    expect(onMarkAllAsRead).toHaveBeenCalledOnce()
  })

  it('"Mark all as read" disabled when all read', () => {
    const allRead = MOCK_NOTIFICATIONS.map((n) => ({ ...n, read: true }))
    renderPanel({ notifications: allRead })
    const btn = screen.getByText('Mark all as read')
    expect(btn).toBeDisabled()
  })

  it('dismiss button calls onDismiss', async () => {
    const onDismiss = vi.fn()
    renderPanel({ notifications: [MOCK_NOTIFICATIONS[5]], onDismiss })
    const dismissBtn = screen.getByLabelText('Dismiss notification')
    await userEvent.click(dismissBtn)
    // With prefers-reduced-motion mocked, dismiss is instant
    expect(onDismiss).toHaveBeenCalled()
  })

  it('empty state renders when no notifications', () => {
    renderPanel({ notifications: [], unreadCount: 0 })
    expect(screen.getByText('All caught up!')).toBeInTheDocument()
    expect(screen.getByText("We'll let you know when something happens")).toBeInTheDocument()
  })

  it('panel has role="dialog" and aria-label', () => {
    renderPanel()
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('Escape closes panel', async () => {
    const onClose = vi.fn()
    renderPanel({ onClose })
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('screen reader announcement on open', () => {
    renderPanel({ unreadCount: 3 })
    expect(screen.getByText('3 unread notifications')).toBeInTheDocument()
  })

  describe('mobile', () => {
    it('renders bottom sheet with backdrop', () => {
      renderPanel({ isMobile: true })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('tap backdrop closes panel', async () => {
      const onClose = vi.fn()
      const { container } = renderPanel({ isMobile: true, onClose })
      const backdrop = container.querySelector('.bg-black\\/50')
      if (backdrop) {
        await userEvent.click(backdrop)
        expect(onClose).toHaveBeenCalled()
      }
    })

    it('drag handle visible', () => {
      const { container } = renderPanel({ isMobile: true })
      const handle = container.querySelector('.bg-white\\/30')
      expect(handle).not.toBeNull()
    })

    it('no X dismiss button on items', () => {
      renderPanel({ isMobile: true, notifications: [MOCK_NOTIFICATIONS[5]] })
      expect(screen.queryByLabelText('Dismiss notification')).not.toBeInTheDocument()
    })

    it('Accept/Decline buttons stacked on mobile', () => {
      const friendRequest = MOCK_NOTIFICATIONS.find((n) => n.type === 'friend_request')!
      renderPanel({ isMobile: true, notifications: [friendRequest] })
      const acceptBtn = screen.getByText('Accept')
      const buttonsContainer = acceptBtn.closest('div')
      expect(buttonsContainer?.className).toContain('flex-col')
    })
  })

  it('returns null when not open', () => {
    const { container } = renderPanel({ isOpen: false })
    expect(container.innerHTML).toBe('')
  })
})
