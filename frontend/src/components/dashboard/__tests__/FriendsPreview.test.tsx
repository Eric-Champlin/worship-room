import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FriendsPreview } from '../FriendsPreview'
import { FRIENDS_KEY } from '@/services/friends-storage'
import type { FriendsData } from '@/types/dashboard'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { name: 'Test User', id: 'test-user-id' },
    login: vi.fn(),
    logout: vi.fn(),
  })),
}))

import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

function renderPreview() {
  return render(
    <MemoryRouter>
      <FriendsPreview />
    </MemoryRouter>,
  )
}

describe('FriendsPreview', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('shows top 3 friends when data exists', () => {
    // useFriends will auto-seed mock data
    renderPreview()
    // Top 3 by lastActive: Joshua B. (15m), Maria L. (30m), Grace H. (1h)
    expect(screen.getByText('Joshua B.')).toBeInTheDocument()
    expect(screen.getByText('Maria L.')).toBeInTheDocument()
    expect(screen.getByText('Grace H.')).toBeInTheDocument()
    // 4th friend should not be visible
    expect(screen.queryByText('Sarah M.')).not.toBeInTheDocument()
  })

  it('shows empty state when no friends', () => {
    // Seed empty friends data
    const emptyData: FriendsData = {
      friends: [],
      pendingIncoming: [],
      pendingOutgoing: [],
      blocked: [],
    }
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(emptyData))

    renderPreview()
    expect(screen.getByText('Faith grows stronger together')).toBeInTheDocument()
  })

  it('"Invite a friend" link in empty state navigates to /friends', () => {
    const emptyData: FriendsData = {
      friends: [],
      pendingIncoming: [],
      pendingOutgoing: [],
      blocked: [],
    }
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(emptyData))

    renderPreview()
    const link = screen.getByRole('link', { name: /Invite a friend/i })
    expect(link).toHaveAttribute('href', '/friends')
  })

  it('shows level names for friends', () => {
    renderPreview()
    expect(screen.getByText('Lighthouse')).toBeInTheDocument() // Joshua B.
    expect(screen.getByText('Oak')).toBeInTheDocument() // Maria L.
  })
})
