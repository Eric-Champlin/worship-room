import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { NudgeButton } from '../NudgeButton'
import { SOCIAL_KEY, NOTIFICATIONS_KEY } from '@/services/social-storage'

const FRIEND_ID = 'friend-rachel-t'
const FRIEND_NAME = 'Rachel T.'
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

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function renderNudge(lastActive: string = daysAgoISO(5)) {
  return render(
    <MemoryRouter>
      <NudgeButton friendId={FRIEND_ID} friendName={FRIEND_NAME} lastActive={lastActive} />
    </MemoryRouter>,
  )
}

function seedNudge(daysAgo: number) {
  const data = {
    encouragements: [],
    nudges: [
      {
        id: 'nudge-1',
        fromUserId: MOCK_USER.id,
        toUserId: FRIEND_ID,
        timestamp: daysAgoISO(daysAgo),
      },
    ],
    recapDismissals: [],
  }
  localStorage.setItem(SOCIAL_KEY, JSON.stringify(data))
}

function resetState() {
  cleanup()
  localStorage.clear()
  mockShowToast.mockClear()
}

describe('NudgeButton visibility', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('renders for friend inactive 3+ days', () => {
    renderNudge(daysAgoISO(5))
    expect(screen.getByLabelText(/send a nudge to rachel t/i)).toBeInTheDocument()
  })

  it('does NOT render for active friend (< 3 days)', () => {
    renderNudge(daysAgoISO(1))
    expect(screen.queryByLabelText(/send a nudge/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Nudge sent')).not.toBeInTheDocument()
  })

  it('shows "Nudge sent" when recently nudged (within 7 days)', () => {
    seedNudge(2)
    renderNudge(daysAgoISO(5))
    expect(screen.getByText('Nudge sent')).toBeInTheDocument()
    expect(screen.queryByLabelText(/send a nudge/i)).not.toBeInTheDocument()
  })

  it('renders normally after 7-day cooldown', () => {
    seedNudge(8)
    renderNudge(daysAgoISO(5))
    expect(screen.getByLabelText(/send a nudge to rachel t/i)).toBeInTheDocument()
  })

  it('does NOT render when nudgePermission=nobody in wr_settings', () => {
    localStorage.setItem('wr_settings', JSON.stringify({ nudgePermission: 'nobody' }))
    renderNudge(daysAgoISO(5))
    expect(screen.queryByLabelText(/send a nudge/i)).not.toBeInTheDocument()
  })
})

describe('NudgeButton dialog interactions', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('clicking button opens dialog', async () => {
    const user = userEvent.setup()
    renderNudge()
    await user.click(screen.getByLabelText(/send a nudge to rachel t/i))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('dialog has correct title and body', async () => {
    const user = userEvent.setup()
    renderNudge()
    await user.click(screen.getByLabelText(/send a nudge to rachel t/i))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText('Send a nudge')).toBeInTheDocument()
    expect(within(dialog).getByText(/thinking of them/i)).toBeInTheDocument()
  })

  it('dialog body does NOT mention inactivity', async () => {
    const user = userEvent.setup()
    renderNudge()
    await user.click(screen.getByLabelText(/send a nudge to rachel t/i))
    const body = screen.getByText(/gentle reminder/i)
    expect(body.textContent).not.toMatch(/days|inactive|away|absent/i)
  })

  it('dialog has role="alertdialog"', async () => {
    const user = userEvent.setup()
    renderNudge()
    await user.click(screen.getByLabelText(/send a nudge to rachel t/i))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('dialog closes on Escape', async () => {
    const user = userEvent.setup()
    renderNudge()
    await user.click(screen.getByLabelText(/send a nudge to rachel t/i))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('dialog closes on backdrop click', async () => {
    const user = userEvent.setup()
    renderNudge()
    await user.click(screen.getByLabelText(/send a nudge to rachel t/i))
    // Click the backdrop (the fixed overlay div)
    const backdrop = screen.getByRole('alertdialog').parentElement!
    await user.click(backdrop)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('dialog is focus-trapped (Tab cycles within)', async () => {
    const user = userEvent.setup()
    renderNudge()
    await user.click(screen.getByLabelText(/send a nudge to rachel t/i))
    const dialog = screen.getByRole('alertdialog')
    const cancelBtn = within(dialog).getByRole('button', { name: 'Cancel' })
    const sendBtn = within(dialog).getByRole('button', { name: 'Send' })
    // Tab should keep focus within dialog
    await user.tab()
    expect([cancelBtn, sendBtn]).toContain(document.activeElement)
  })
})

describe('NudgeButton send flow', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('confirming nudge stores data, creates notification, shows toast, updates button, and persists', async () => {
    const user = userEvent.setup()
    renderNudge()
    await user.click(screen.getByLabelText(/send a nudge to rachel t/i))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    // Stored in localStorage
    const data = JSON.parse(localStorage.getItem(SOCIAL_KEY)!)
    expect(data.nudges).toHaveLength(1)
    expect(data.nudges[0].toUserId).toBe(FRIEND_ID)

    // Notification created
    const notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)!)
    expect(notifications.length).toBeGreaterThanOrEqual(1)
    expect(notifications[0].type).toBe('nudge')

    // Toast shown
    expect(mockShowToast).toHaveBeenCalledWith('Nudge sent to Rachel T.', 'success')

    // Button changed to "Nudge sent"
    expect(screen.getByText('Nudge sent')).toBeInTheDocument()

    // Re-render — should still show "Nudge sent" (persists in localStorage)
    cleanup()
    renderNudge()
    expect(screen.getByText('Nudge sent')).toBeInTheDocument()
  })
})

describe('NudgeButton FriendRow integration', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('FriendRow renders NudgeButton for inactive friend', async () => {
    const { FriendRow } = await import('@/components/friends/FriendRow')
    // Use a different friend ID to avoid localStorage leaking from other tests
    const friend = {
      id: 'friend-integration-nudge',
      displayName: 'Test Friend',
      avatar: '',
      level: 3,
      levelName: 'Blooming',
      currentStreak: 0,
      faithPoints: 720,
      weeklyPoints: 0,
      lastActive: daysAgoISO(5),
    }
    render(
      <MemoryRouter>
        <FriendRow friend={friend} onRemove={vi.fn()} onBlock={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText(/send a nudge to test friend/i)).toBeInTheDocument()
  })
})
