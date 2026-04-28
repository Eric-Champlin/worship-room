import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFriends } from '../useFriends'
import { FRIENDS_KEY } from '@/services/friends-storage'
import { MOCK_SUGGESTIONS } from '@/mocks/friends-mock-data'
import type { FriendProfile, FriendRequest, FriendsData } from '@/types/dashboard'
import type { FriendRequestDto } from '@/types/api/friends'

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { name: 'Test User', id: 'test-user-id' },
    login: vi.fn(),
    logout: vi.fn(),
  })),
}))

// Spec 2.5.4 — mocks for dual-write feature flag, JWT presence, and api functions.
vi.mock('@/lib/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env')>()
  return { ...actual, isBackendFriendsEnabled: vi.fn(() => false) }
})

vi.mock('@/lib/auth-storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth-storage')>()
  return { ...actual, getStoredToken: vi.fn(() => null) }
})

vi.mock('@/services/api/friends-api', () => ({
  sendFriendRequestApi: vi.fn(),
  respondToFriendRequestApi: vi.fn(),
  removeFriendApi: vi.fn(),
  blockUserApi: vi.fn(),
  unblockUserApi: vi.fn(),
}))

// Get reference to control mock
import { useAuth } from '@/hooks/useAuth'
import { isBackendFriendsEnabled } from '@/lib/env'
import { getStoredToken } from '@/lib/auth-storage'
import {
  sendFriendRequestApi,
  respondToFriendRequestApi,
  removeFriendApi,
  blockUserApi,
  unblockUserApi,
} from '@/services/api/friends-api'
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

describe('useFriends — dual-write (Spec 2.5.4)', () => {
  function makeProfile(id: string, displayName = id): FriendProfile {
    return {
      id,
      displayName,
      avatar: '',
      level: 1,
      levelName: 'Seedling',
      currentStreak: 0,
      faithPoints: 0,
      weeklyPoints: 0,
      lastActive: new Date().toISOString(),
    }
  }

  function makeFriendRequestDto(overrides: Partial<FriendRequestDto> = {}): FriendRequestDto {
    return {
      id: 'backend-uuid-default',
      fromUserId: 'test-user-id',
      toUserId: 'user-caleb-w',
      otherPartyDisplayName: 'Caleb W.',
      otherPartyAvatarUrl: null,
      message: null,
      status: 'pending',
      createdAt: '2026-04-27T00:00:00Z',
      respondedAt: null,
      ...overrides,
    }
  }

  function seedFriendsData(data: FriendsData): void {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(data))
  }

  beforeEach(() => {
    localStorage.clear()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(false)
    vi.mocked(getStoredToken).mockReturnValue(null)
    vi.mocked(sendFriendRequestApi).mockReset().mockResolvedValue(undefined as never)
    vi.mocked(respondToFriendRequestApi).mockReset().mockResolvedValue(undefined)
    vi.mocked(removeFriendApi).mockReset().mockResolvedValue(undefined)
    vi.mocked(blockUserApi).mockReset().mockResolvedValue(undefined)
    vi.mocked(unblockUserApi).mockReset().mockResolvedValue(undefined)
  })

  // Group A — Flag-off behavior
  it('flag off + no JWT → no api calls fire for sendRequest', () => {
    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.sendRequest(MOCK_SUGGESTIONS[0])
    })
    expect(sendFriendRequestApi).not.toHaveBeenCalled()
  })

  it('flag off + no JWT → no api calls fire for any of the 6 mutations', () => {
    const { result } = renderHook(() => useFriends())
    const incomingId = result.current.pendingIncoming[0].id
    const outgoingId = result.current.pendingOutgoing[0].id
    act(() => {
      result.current.sendRequest(MOCK_SUGGESTIONS[0])
    })
    act(() => {
      result.current.acceptRequest(incomingId)
    })
    // Decline the second incoming request that's still present
    const remainingIncomingId = result.current.pendingIncoming[0].id
    act(() => {
      result.current.declineRequest(remainingIncomingId)
    })
    act(() => {
      result.current.cancelRequest(outgoingId)
    })
    act(() => {
      result.current.removeFriend('friend-sarah-m')
    })
    act(() => {
      result.current.blockUser('user-caleb-w')
    })
    expect(sendFriendRequestApi).not.toHaveBeenCalled()
    expect(respondToFriendRequestApi).not.toHaveBeenCalled()
    expect(removeFriendApi).not.toHaveBeenCalled()
    expect(blockUserApi).not.toHaveBeenCalled()
  })

  // Group B — Flag-on + JWT behavior
  it('flag on + JWT → sendRequest fires sendFriendRequestApi with correct args', async () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')
    vi.mocked(sendFriendRequestApi).mockResolvedValue(makeFriendRequestDto())

    const { result } = renderHook(() => useFriends())
    await act(async () => {
      result.current.sendRequest(MOCK_SUGGESTIONS[0])
    })
    expect(sendFriendRequestApi).toHaveBeenCalledWith('user-caleb-w', null)
  })

  it('flag on + JWT → sendRequest success attaches backendId to local request', async () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')
    vi.mocked(sendFriendRequestApi).mockResolvedValue(
      makeFriendRequestDto({ id: 'backend-uuid-123', toUserId: 'user-caleb-w' }),
    )

    const { result } = renderHook(() => useFriends())
    await act(async () => {
      result.current.sendRequest(MOCK_SUGGESTIONS[0])
    })
    await vi.waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(FRIENDS_KEY)!) as FriendsData
      const outgoing = stored.pendingOutgoing.find((r) => r.to.id === 'user-caleb-w')
      expect(outgoing?.backendId).toBe('backend-uuid-123')
    })
  })

  it('flag on + JWT → acceptRequest with backendId fires PATCH accept', () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')

    const incoming: FriendRequest = {
      id: 'local-req-1',
      from: makeProfile('alice'),
      to: makeProfile('test-user-id', 'You'),
      sentAt: new Date().toISOString(),
      backendId: 'backend-req-uuid',
    }
    seedFriendsData({
      friends: [],
      pendingIncoming: [incoming],
      pendingOutgoing: [],
      blocked: [],
    })

    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.acceptRequest('local-req-1')
    })
    expect(respondToFriendRequestApi).toHaveBeenCalledWith('backend-req-uuid', 'accept')
  })

  it('flag on + JWT → acceptRequest WITHOUT backendId does not fire api; logs warning', () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const incoming: FriendRequest = {
      id: 'local-req-no-backend',
      from: makeProfile('alice'),
      to: makeProfile('test-user-id', 'You'),
      sentAt: new Date().toISOString(),
    }
    seedFriendsData({
      friends: [],
      pendingIncoming: [incoming],
      pendingOutgoing: [],
      blocked: [],
    })

    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.acceptRequest('local-req-no-backend')
    })
    expect(respondToFriendRequestApi).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      '[useFriends] skipping backend acceptRequest — no backendId on local request',
      { localRequestId: 'local-req-no-backend' },
    )
    warnSpy.mockRestore()
  })

  it('flag on + JWT → declineRequest with backendId fires PATCH decline', () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')

    const incoming: FriendRequest = {
      id: 'local-req-decline',
      from: makeProfile('alice'),
      to: makeProfile('test-user-id', 'You'),
      sentAt: new Date().toISOString(),
      backendId: 'backend-req-decline',
    }
    seedFriendsData({
      friends: [],
      pendingIncoming: [incoming],
      pendingOutgoing: [],
      blocked: [],
    })

    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.declineRequest('local-req-decline')
    })
    expect(respondToFriendRequestApi).toHaveBeenCalledWith('backend-req-decline', 'decline')
  })

  it('flag on + JWT → cancelRequest with backendId fires PATCH cancel', () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')

    const outgoing: FriendRequest = {
      id: 'local-req-cancel',
      from: makeProfile('test-user-id', 'You'),
      to: makeProfile('bob'),
      sentAt: new Date().toISOString(),
      backendId: 'backend-req-cancel',
    }
    seedFriendsData({
      friends: [],
      pendingIncoming: [],
      pendingOutgoing: [outgoing],
      blocked: [],
    })

    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.cancelRequest('local-req-cancel')
    })
    expect(respondToFriendRequestApi).toHaveBeenCalledWith('backend-req-cancel', 'cancel')
  })

  it('flag on + JWT → removeFriend fires DELETE /api/v1/users/me/friends/{id}', () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')

    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.removeFriend('friend-sarah-m')
    })
    expect(removeFriendApi).toHaveBeenCalledWith('friend-sarah-m')
  })

  it('flag on + JWT → blockUser fires POST /api/v1/users/me/blocks', () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')

    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.blockUser('user-caleb-w')
    })
    expect(blockUserApi).toHaveBeenCalledWith('user-caleb-w')
  })

  // Group C — Error handling
  it('sendRequest backend error → console.warn, localStorage unchanged', async () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')
    vi.mocked(sendFriendRequestApi).mockRejectedValue(new Error('network down'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useFriends())
    const beforeOutgoingCount = result.current.pendingOutgoing.length
    await act(async () => {
      result.current.sendRequest(MOCK_SUGGESTIONS[0])
    })
    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        '[useFriends] backend sendRequest dual-write failed:',
        expect.any(Error),
      )
    })
    // localStorage write completed before the api call rejected; the new outgoing
    // request remains in localStorage (no rollback).
    const stored = JSON.parse(localStorage.getItem(FRIENDS_KEY)!) as FriendsData
    expect(stored.pendingOutgoing.length).toBe(beforeOutgoingCount + 1)
    warnSpy.mockRestore()
  })

  it('removeFriend backend error → console.warn, localStorage unchanged', async () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')
    vi.mocked(removeFriendApi).mockRejectedValue(new Error('500'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useFriends())
    await act(async () => {
      result.current.removeFriend('friend-sarah-m')
    })
    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        '[useFriends] backend removeFriend dual-write failed:',
        expect.any(Error),
      )
    })
    const stored = JSON.parse(localStorage.getItem(FRIENDS_KEY)!) as FriendsData
    expect(stored.friends.find((f) => f.id === 'friend-sarah-m')).toBeUndefined()
    warnSpy.mockRestore()
  })

  // Group D — Auth-state guard (Watch-For #1)
  it('flag on + simulated-auth (no JWT) → no api calls fire for any mutation', () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue(null)

    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.sendRequest(MOCK_SUGGESTIONS[0])
    })
    act(() => {
      result.current.removeFriend('friend-sarah-m')
    })
    act(() => {
      result.current.blockUser('user-caleb-w')
    })
    expect(sendFriendRequestApi).not.toHaveBeenCalled()
    expect(removeFriendApi).not.toHaveBeenCalled()
    expect(blockUserApi).not.toHaveBeenCalled()
  })

  it('flag on + JWT → shouldDualWrite true (sendRequest fires)', async () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')
    vi.mocked(sendFriendRequestApi).mockResolvedValue(makeFriendRequestDto())

    const { result } = renderHook(() => useFriends())
    await act(async () => {
      result.current.sendRequest(MOCK_SUGGESTIONS[0])
    })
    expect(sendFriendRequestApi).toHaveBeenCalledTimes(1)
  })

  // Spec 2.5.6 — unblockUser dual-write tests
  it('flag off + no JWT → no api call fires for unblockUser', () => {
    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.blockUser('user-caleb-w')
    })
    act(() => {
      result.current.unblockUser('user-caleb-w')
    })
    expect(unblockUserApi).not.toHaveBeenCalled()
  })

  it('flag on + JWT → unblockUser fires DELETE /api/v1/users/me/blocks/{id}', () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')

    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.unblockUser('user-caleb-w')
    })
    expect(unblockUserApi).toHaveBeenCalledWith('user-caleb-w')
  })

  it('flag on + simulated-auth (no JWT) → no api call fires for unblockUser', () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue(null)

    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.unblockUser('user-caleb-w')
    })
    expect(unblockUserApi).not.toHaveBeenCalled()
  })

  it('unblockUser removes user from data.blocked (localStorage)', () => {
    const { result } = renderHook(() => useFriends())
    act(() => {
      result.current.blockUser('user-caleb-w')
    })
    expect(result.current.blocked).toContain('user-caleb-w')
    act(() => {
      result.current.unblockUser('user-caleb-w')
    })
    expect(result.current.blocked).not.toContain('user-caleb-w')
  })

  it('unblockUser backend error → console.warn, localStorage still updated', async () => {
    vi.mocked(isBackendFriendsEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-token')
    vi.mocked(unblockUserApi).mockRejectedValue(new Error('500'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    seedFriendsData({
      friends: [],
      pendingIncoming: [],
      pendingOutgoing: [],
      blocked: ['user-caleb-w'],
    })

    const { result } = renderHook(() => useFriends())
    await act(async () => {
      result.current.unblockUser('user-caleb-w')
    })
    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        '[useFriends] backend unblockUser dual-write failed:',
        expect.any(Error),
      )
    })
    const stored = JSON.parse(localStorage.getItem(FRIENDS_KEY)!) as FriendsData
    expect(stored.blocked).not.toContain('user-caleb-w')
    warnSpy.mockRestore()
  })
})
