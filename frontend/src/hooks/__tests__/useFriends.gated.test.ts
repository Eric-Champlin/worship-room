import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Spec 1.10f — useFriends.sendRequest / useFriends.acceptRequest must be
// wrapped via useGatedAction so legal-version-stale users have their
// mutation queued and replayed after acceptance, instead of silently
// completing the localStorage write.
//
// This test file mocks useLegalVersionGateOptional so we can deterministically
// flip between current and stale acceptance states. The mock is dedicated
// to this file (kept separate from useFriends.test.ts) to avoid colliding
// with that suite's existing static module mocks. The other useFriends
// behaviors (initial mock data, sorting, dual-write) are covered exhaustively
// in useFriends.test.ts and are not re-tested here.
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { name: 'Test User', id: 'test-user-id' },
    login: vi.fn(),
    logout: vi.fn(),
  })),
}))

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

// Mutable mock state for the legal gate.
const gateState = {
  isStaleAcceptance: false,
  queueAndShow: vi.fn(),
}

vi.mock('@/components/legal/LegalVersionGate', () => ({
  useLegalVersionGateOptional: () => gateState,
  useLegalVersionGate: () => gateState,
  LegalVersionGate: ({ children }: { children: React.ReactNode }) => children,
}))

import { useFriends } from '../useFriends'
import { MOCK_SUGGESTIONS } from '@/mocks/friends-mock-data'

describe('useFriends — gated-action behavior (Spec 1.10f)', () => {
  beforeEach(() => {
    localStorage.clear()
    gateState.isStaleAcceptance = false
    gateState.queueAndShow.mockReset()
  })

  it('sendRequest fires the underlying mutation when versions are current', () => {
    gateState.isStaleAcceptance = false

    const { result } = renderHook(() => useFriends())
    const initialOutgoing = result.current.pendingOutgoing.length

    act(() => {
      result.current.sendRequest(MOCK_SUGGESTIONS[0])
    })

    expect(result.current.pendingOutgoing.length).toBe(initialOutgoing + 1)
    expect(gateState.queueAndShow).not.toHaveBeenCalled()
  })

  it('sendRequest blocks the underlying mutation and queues when versions are stale', () => {
    gateState.isStaleAcceptance = true

    const { result } = renderHook(() => useFriends())
    const initialOutgoing = result.current.pendingOutgoing.length

    act(() => {
      result.current.sendRequest(MOCK_SUGGESTIONS[0])
    })

    // Underlying action did NOT fire — pendingOutgoing unchanged.
    expect(result.current.pendingOutgoing.length).toBe(initialOutgoing)
    expect(gateState.queueAndShow).toHaveBeenCalledTimes(1)
    expect(typeof gateState.queueAndShow.mock.calls[0][0]).toBe('function')
  })

  it('acceptRequest fires the underlying mutation when versions are current', () => {
    gateState.isStaleAcceptance = false

    const { result } = renderHook(() => useFriends())
    const initialFriendCount = result.current.friendCount
    const requestId = result.current.pendingIncoming[0].id

    act(() => {
      result.current.acceptRequest(requestId)
    })

    expect(result.current.friendCount).toBe(initialFriendCount + 1)
    expect(gateState.queueAndShow).not.toHaveBeenCalled()
  })

  it('acceptRequest blocks the underlying mutation and queues when versions are stale', () => {
    gateState.isStaleAcceptance = true

    const { result } = renderHook(() => useFriends())
    const initialFriendCount = result.current.friendCount
    const requestId = result.current.pendingIncoming[0].id

    act(() => {
      result.current.acceptRequest(requestId)
    })

    // Friend count unchanged — the action was queued, not executed.
    expect(result.current.friendCount).toBe(initialFriendCount)
    expect(gateState.queueAndShow).toHaveBeenCalledTimes(1)
  })

  it('declineRequest is NOT gated and fires regardless of stale acceptance', () => {
    // Per Spec D9: only sendRequest and acceptRequest are gated. Safety
    // actions (decline / cancel / remove / block / unblock) bypass the gate
    // because they should always fire.
    gateState.isStaleAcceptance = true

    const { result } = renderHook(() => useFriends())
    const requestId = result.current.pendingIncoming[0].id
    const initialIncoming = result.current.pendingIncoming.length

    act(() => {
      result.current.declineRequest(requestId)
    })

    expect(result.current.pendingIncoming.length).toBe(initialIncoming - 1)
    expect(gateState.queueAndShow).not.toHaveBeenCalled()
  })
})
