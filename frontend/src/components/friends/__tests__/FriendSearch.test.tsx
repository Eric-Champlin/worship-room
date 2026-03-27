import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FriendSearchResult } from '@/hooks/useFriends'
import { FriendSearch } from '../FriendSearch'

const MOCK_RESULTS: FriendSearchResult[] = [
  {
    id: 'friend-1',
    displayName: 'Sarah M.',
    avatar: '',
    level: 3,
    levelName: 'Blooming',
    currentStreak: 10,
    faithPoints: 500,
    weeklyPoints: 50,
    lastActive: new Date().toISOString(),
    status: 'friend',
  },
  {
    id: 'pending-1',
    displayName: 'Emma C.',
    avatar: '',
    level: 2,
    levelName: 'Sprout',
    currentStreak: 5,
    faithPoints: 200,
    weeklyPoints: 30,
    lastActive: new Date().toISOString(),
    status: 'pending-incoming',
  },
  {
    id: 'new-1',
    displayName: 'Caleb W.',
    avatar: '',
    level: 2,
    levelName: 'Sprout',
    currentStreak: 8,
    faithPoints: 220,
    weeklyPoints: 45,
    lastActive: new Date().toISOString(),
    status: 'none',
  },
]

describe('FriendSearch', () => {
  const mockSearchUsers = vi.fn<(q: string) => FriendSearchResult[]>()
  const mockOnSendRequest = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockSearchUsers.mockReset()
    mockOnSendRequest.mockReset()
    mockSearchUsers.mockReturnValue(MOCK_RESULTS)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderSearch() {
    return render(
      <FriendSearch searchUsers={mockSearchUsers} onSendRequest={mockOnSendRequest} />,
    )
  }

  it('renders search input with placeholder', () => {
    renderSearch()
    expect(screen.getByPlaceholderText('Search by name...')).toBeInTheDocument()
  })

  it('has aria-label on input', () => {
    renderSearch()
    expect(screen.getByLabelText('Search friends')).toBeInTheDocument()
  })

  it('debounces input at 300ms', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()
    const input = screen.getByLabelText('Search friends')

    await user.type(input, 'Sa')
    expect(mockSearchUsers).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(mockSearchUsers).toHaveBeenCalledWith('Sa')
  })

  it('shows dropdown on results', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()
    const input = screen.getByLabelText('Search friends')

    await user.type(input, 'Sa')
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('shows "Already friends" for existing friends', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()

    await user.type(screen.getByLabelText('Search friends'), 'Sa')
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText('Already friends')).toBeInTheDocument()
  })

  it('shows "Request pending" for pending', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()

    await user.type(screen.getByLabelText('Search friends'), 'Em')
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText('Request pending')).toBeInTheDocument()
  })

  it('shows "Add Friend" for new users', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()

    await user.type(screen.getByLabelText('Search friends'), 'Ca')
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByRole('button', { name: 'Add Friend' })).toBeInTheDocument()
  })

  it('no results message', async () => {
    mockSearchUsers.mockReturnValue([])
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()

    await user.type(screen.getByLabelText('Search friends'), 'zzz')
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText(/No users found/)).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()

    await user.type(screen.getByLabelText('Search friends'), 'Sa')
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes on outside click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()

    await user.type(screen.getByLabelText('Search friends'), 'Sa')
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.click(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('ARIA: listbox and option roles', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()

    await user.type(screen.getByLabelText('Search friends'), 'Sa')
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('input has combobox role with aria-expanded', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()

    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-expanded', 'false')

    await user.type(input, 'Sa')
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(input).toHaveAttribute('aria-expanded', 'true')
  })

  it('arrow keys navigate options', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()

    await user.type(screen.getByLabelText('Search friends'), 'Sa')
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    const options = screen.getAllByRole('option')

    // ArrowDown highlights first option
    await user.keyboard('{ArrowDown}')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')

    // ArrowDown again highlights second option
    await user.keyboard('{ArrowDown}')
    expect(options[0]).toHaveAttribute('aria-selected', 'false')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')

    // ArrowUp goes back to first
    await user.keyboard('{ArrowUp}')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('Enter on active option with status "none" sends request', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSearch()

    await user.type(screen.getByLabelText('Search friends'), 'Ca')
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    // Navigate to Caleb W. (index 2 — third option, status 'none')
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    await user.keyboard('{Enter}')

    expect(mockOnSendRequest).toHaveBeenCalledWith(MOCK_RESULTS[2])
  })
})
