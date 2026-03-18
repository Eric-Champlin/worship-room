import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui/Toast'
import type { FriendRequest, FriendProfile } from '@/types/dashboard'
import { PendingRequests } from '../PendingRequests'

const CURRENT_USER: FriendProfile = {
  id: 'me',
  displayName: 'Me',
  avatar: '',
  level: 1,
  levelName: 'Seedling',
  currentStreak: 0,
  faithPoints: 0,
  weeklyPoints: 0,
  lastActive: new Date().toISOString(),
}

const EMMA: FriendProfile = {
  id: 'emma',
  displayName: 'Emma C.',
  avatar: '',
  level: 2,
  levelName: 'Sprout',
  currentStreak: 5,
  faithPoints: 150,
  weeklyPoints: 30,
  lastActive: new Date().toISOString(),
}

const NAOMI: FriendProfile = {
  id: 'naomi',
  displayName: 'Naomi F.',
  avatar: '',
  level: 1,
  levelName: 'Seedling',
  currentStreak: 2,
  faithPoints: 40,
  weeklyPoints: 20,
  lastActive: new Date().toISOString(),
}

const INCOMING: FriendRequest[] = [
  { id: 'req-1', from: EMMA, to: CURRENT_USER, sentAt: new Date().toISOString() },
]

const OUTGOING: FriendRequest[] = [
  { id: 'req-2', from: CURRENT_USER, to: NAOMI, sentAt: new Date().toISOString() },
]

function renderPending(
  incoming: FriendRequest[] = INCOMING,
  outgoing: FriendRequest[] = OUTGOING,
) {
  const onAccept = vi.fn()
  const onDecline = vi.fn()
  const onCancel = vi.fn()

  const result = render(
    <ToastProvider>
      <PendingRequests
        incoming={incoming}
        outgoing={outgoing}
        onAccept={onAccept}
        onDecline={onDecline}
        onCancel={onCancel}
      />
    </ToastProvider>,
  )

  return { ...result, onAccept, onDecline, onCancel }
}

describe('PendingRequests', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hidden when no pending requests', () => {
    renderPending([], [])
    expect(screen.queryByText('Pending Requests')).not.toBeInTheDocument()
  })

  it('shows incoming requests with Accept/Decline', () => {
    renderPending()
    expect(screen.getByText('Incoming')).toBeInTheDocument()
    expect(screen.getByText('Emma C.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Accept friend request from Emma C/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Decline friend request from Emma C/i })).toBeInTheDocument()
  })

  it('accept shows toast with friend name', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { onAccept } = renderPending()

    await user.click(screen.getByRole('button', { name: /Accept friend request from Emma C/i }))
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(onAccept).toHaveBeenCalledWith('req-1')
    expect(screen.getByText(/You and Emma C. are now friends!/)).toBeInTheDocument()
  })

  it('decline removes without toast', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { onDecline } = renderPending()

    await user.click(screen.getByRole('button', { name: /Decline friend request from Emma C/i }))
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(onDecline).toHaveBeenCalledWith('req-1')
    expect(screen.queryByText(/are now friends/)).not.toBeInTheDocument()
  })

  it('cancel removes outgoing request', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { onCancel } = renderPending()

    expect(screen.getByText('Naomi F.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(onCancel).toHaveBeenCalledWith('req-2')
  })

  it('buttons disabled after click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPending()

    const acceptBtn = screen.getByRole('button', { name: /Accept friend request from Emma C/i })
    await user.click(acceptBtn)
    expect(acceptBtn).toBeDisabled()

    await act(async () => {
      vi.advanceTimersByTime(300)
    })
  })

  it('accept button has descriptive aria-label', () => {
    renderPending()
    expect(screen.getByLabelText('Accept friend request from Emma C.')).toBeInTheDocument()
  })

  it('shows outgoing section with Pending label', () => {
    renderPending()
    expect(screen.getByText('Outgoing')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })
})
