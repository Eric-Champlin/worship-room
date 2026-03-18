import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NotificationPanel } from '../NotificationPanel'
import { NotificationBell } from '../NotificationBell'
import { MOCK_NOTIFICATIONS } from '@/mocks/notifications-mock-data'

// Mock prefers-reduced-motion
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

const defaultPanelProps = {
  isOpen: true,
  onClose: vi.fn(),
  isMobile: true,
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

describe('Notification Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.matchMedia = mockMatchMedia
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.classList.remove('overflow-hidden')
  })

  it('mobile scroll lock: body gets overflow-hidden when panel open', () => {
    render(<NotificationPanel {...defaultPanelProps} isMobile={true} isOpen={true} />)
    expect(document.body.classList.contains('overflow-hidden')).toBe(true)
  })

  it('mobile scroll lock: body restored when panel closes', () => {
    const { unmount } = render(<NotificationPanel {...defaultPanelProps} isMobile={true} isOpen={true} />)
    expect(document.body.classList.contains('overflow-hidden')).toBe(true)
    unmount()
    expect(document.body.classList.contains('overflow-hidden')).toBe(false)
  })

  it('rapid-click: Accept button disabled after first click', async () => {
    const friendRequest = MOCK_NOTIFICATIONS.find((n) => n.type === 'friend_request')!
    render(<NotificationPanel {...defaultPanelProps} notifications={[friendRequest]} />)

    const acceptBtn = screen.getByText('Accept')
    await userEvent.click(acceptBtn)
    expect(acceptBtn).toBeDisabled()
  })

  it('localStorage unavailable: graceful degradation', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    // Should not throw when rendering
    expect(() => {
      render(<NotificationPanel {...defaultPanelProps} notifications={[]} unreadCount={0} />)
    }).not.toThrow()
    spy.mockRestore()
  })

  it('z-index: panel renders with z-[60] class', () => {
    const { container } = render(<NotificationPanel {...defaultPanelProps} isMobile={false} />)
    const panelContainer = container.querySelector('.z-\\[60\\]')
    expect(panelContainer).not.toBeNull()
  })

  it('z-index: mobile panel renders with z-[60] class', () => {
    const { container } = render(<NotificationPanel {...defaultPanelProps} isMobile={true} />)
    const panelContainer = container.querySelector('.z-\\[60\\]')
    expect(panelContainer).not.toBeNull()
  })

  it('no scroll lock on desktop', () => {
    render(<NotificationPanel {...defaultPanelProps} isMobile={false} isOpen={true} />)
    expect(document.body.classList.contains('overflow-hidden')).toBe(false)
  })
})
