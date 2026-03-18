import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFriends } from '../useFriends'
import { FRIENDS_KEY } from '@/services/friends-storage'
import { MOCK_SUGGESTIONS } from '@/mocks/friends-mock-data'

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { name: 'Test User', id: 'test-user-id' },
    login: vi.fn(),
    logout: vi.fn(),
  })),
}))

// Get reference to control mock
import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

describe('useFriends', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('returns empty state when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    const { result } = renderHook(() => useFriends())
    expect(result.current.friends).toHaveLength(0)
    expect(result.current.friendCount).toBe(0)
    expect(result.current.pendingIncoming).toHaveLength(0)
    expect(result.current.suggestions).toHaveLength(0)
  })

  it('initializes with mock data on first use', () => {
    const { result } = renderHook(() => useFriends())
    expect(result.current.friends).toHaveLength(10)
    expect(result.current.friendCount).toBe(10)
  })

  it('friends sorted by lastActive descending', () => {
    const { result } = renderHook(() => useFriends())
    const friends = result.current.friends
    for (let i = 0; i < friends.length - 1; i++) {
      expect(new Date(friends[i].lastActive).getTime()).toBeGreaterThanOrEqual(
        new Date(friends[i + 1].lastActive).getTime(),
      )
    }
  })

  it('has 2 pending incoming and 1 pending outgoing', () => {
    const { result } = renderHook(() => useFriends())
    expect(result.current.pendingIncoming).toHaveLength(2)
    expect(result.current.pendingOutgoing).toHaveLength(1)
  })

  it('suggestions exclude friends, pending, and blocked', () => {
    const { result } = renderHook(() => useFriends())
    expect(result.current.suggestions).toHaveLength(3)
  })

  describe('searchUsers', () => {
    it('excludes blocked users', () => {
      const { result } = renderHook(() => useFriends())
      // Block a user first
      act(() => {
        result.current.blockUser('friend-sarah-m')
      })
      const results = result.current.searchUsers('Sarah')
      expect(results.find((r) => r.id === 'friend-sarah-m')).toBeUndefined()
    })

    it('excludes self', () => {
      const { result } = renderHook(() => useFriends())
      const results = result.current.searchUsers('Test')
      expect(results.find((r) => r.id === 'test-user-id')).toBeUndefined()
    })

    it('annotates friend status', () => {
      const { result } = renderHook(() => useFriends())
      const results = result.current.searchUsers('Sarah')
      const sarah = results.find((r) => r.id === 'friend-sarah-m')
      expect(sarah?.status).toBe('friend')
    })

    it('annotates pending-incoming status', () => {
      const { result } = renderHook(() => useFriends())
      const results = result.current.searchUsers('Emma')
      const emma = results.find((r) => r.id === 'user-emma-c')
      expect(emma?.status).toBe('pending-incoming')
    })

    it('annotates pending-outgoing status', () => {
      const { result } = renderHook(() => useFriends())
      const results = result.current.searchUsers('Naomi')
      const naomi = results.find((r) => r.id === 'user-naomi-f')
      expect(naomi?.status).toBe('pending-outgoing')
    })

    it('returns empty for query shorter than 2 chars', () => {
      const { result } = renderHook(() => useFriends())
      expect(result.current.searchUsers('S')).toHaveLength(0)
    })
  })

  describe('actions', () => {
    it('sendRequest updates pendingOutgoing', () => {
      const { result } = renderHook(() => useFriends())
      act(() => {
        result.current.sendRequest(MOCK_SUGGESTIONS[0])
      })
      expect(result.current.pendingOutgoing).toHaveLength(2) // 1 initial + 1 new
    })

    it('acceptRequest moves to friends', () => {
      const { result } = renderHook(() => useFriends())
      const requestId = result.current.pendingIncoming[0].id
      act(() => {
        result.current.acceptRequest(requestId)
      })
      expect(result.current.friendCount).toBe(11)
      expect(result.current.pendingIncoming).toHaveLength(1)
    })

    it('declineRequest removes from incoming', () => {
      const { result } = renderHook(() => useFriends())
      const requestId = result.current.pendingIncoming[0].id
      act(() => {
        result.current.declineRequest(requestId)
      })
      expect(result.current.pendingIncoming).toHaveLength(1)
      expect(result.current.friendCount).toBe(10) // unchanged
    })

    it('removeFriend decreases friend count', () => {
      const { result } = renderHook(() => useFriends())
      act(() => {
        result.current.removeFriend('friend-sarah-m')
      })
      expect(result.current.friendCount).toBe(9)
    })

    it('blockUser prevents future searches', () => {
      const { result } = renderHook(() => useFriends())
      act(() => {
        result.current.blockUser('friend-sarah-m')
      })
      expect(result.current.friendCount).toBe(9)
      const results = result.current.searchUsers('Sarah')
      expect(results.find((r) => r.id === 'friend-sarah-m')).toBeUndefined()
    })

    it('actions no-op when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      })
      const { result } = renderHook(() => useFriends())
      const initialCount = result.current.friendCount
      act(() => {
        result.current.sendRequest(MOCK_SUGGESTIONS[0])
      })
      expect(result.current.friendCount).toBe(initialCount)
    })
  })

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.removeFriend('friend-sarah-m')
    })
    const stored = JSON.parse(localStorage.getItem(FRIENDS_KEY)!)
    expect(stored.friends).toHaveLength(9)
  })
})
