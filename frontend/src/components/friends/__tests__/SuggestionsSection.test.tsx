import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FriendProfile } from '@/types/dashboard'
import { SuggestionsSection } from '../SuggestionsSection'

const SUGGESTIONS: FriendProfile[] = [
  {
    id: 'caleb',
    displayName: 'Caleb W.',
    avatar: '',
    level: 2,
    levelName: 'Sprout',
    currentStreak: 8,
    faithPoints: 220,
    weeklyPoints: 45,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'lydia',
    displayName: 'Lydia P.',
    avatar: '',
    level: 3,
    levelName: 'Blooming',
    currentStreak: 19,
    faithPoints: 780,
    weeklyPoints: 90,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'micah',
    displayName: 'Micah J.',
    avatar: '',
    level: 1,
    levelName: 'Seedling',
    currentStreak: 1,
    faithPoints: 30,
    weeklyPoints: 15,
    lastActive: new Date().toISOString(),
  },
]

describe('SuggestionsSection', () => {
  it('renders 3 suggestion cards', () => {
    const onSend = vi.fn()
    render(<SuggestionsSection suggestions={SUGGESTIONS} onSendRequest={onSend} />)
    expect(screen.getByText('Caleb W.')).toBeInTheDocument()
    expect(screen.getByText('Lydia P.')).toBeInTheDocument()
    expect(screen.getByText('Micah J.')).toBeInTheDocument()
  })

  it('shows "Active on Prayer Wall" context', () => {
    const onSend = vi.fn()
    render(<SuggestionsSection suggestions={SUGGESTIONS} onSendRequest={onSend} />)
    expect(screen.getAllByText('Active on Prayer Wall')).toHaveLength(3)
  })

  it('"Add Friend" sends request and disables', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<SuggestionsSection suggestions={SUGGESTIONS} onSendRequest={onSend} />)

    const addButtons = screen.getAllByRole('button', { name: 'Add Friend' })
    await user.click(addButtons[0])

    expect(onSend).toHaveBeenCalledWith(SUGGESTIONS[0])
    expect(screen.getByText('Request Sent')).toBeInTheDocument()
    // Remaining 2 still show "Add Friend"
    expect(screen.getAllByRole('button', { name: 'Add Friend' })).toHaveLength(2)
  })

  it('section hidden when no suggestions', () => {
    const onSend = vi.fn()
    const { container } = render(
      <SuggestionsSection suggestions={[]} onSendRequest={onSend} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('"Request Sent" button is disabled', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<SuggestionsSection suggestions={SUGGESTIONS} onSendRequest={onSend} />)

    await user.click(screen.getAllByRole('button', { name: 'Add Friend' })[0])
    const sentBtn = screen.getByRole('button', { name: 'Request Sent' })
    expect(sentBtn).toBeDisabled()
  })
})
