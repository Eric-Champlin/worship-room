/**
 * Spec 2.5.4b dual-write tests for useSocialInteractions.
 *
 * Lives in a separate file from useSocialInteractions.test.ts so the
 * env-flag and JWT mocks (set per-test) are not polluted by the outer
 * suite's mock setup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useSocialInteractions } from '../useSocialInteractions'
import type { FriendsData, FriendProfile } from '@/types/dashboard'
import { SOCIAL_KEY } from '@/services/social-storage'
import { FRIENDS_KEY } from '@/services/friends-storage'

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
  return { ...actual, isBackendSocialEnabled: vi.fn(() => false) }
})

vi.mock('@/lib/auth-storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth-storage')>()
  return { ...actual, getStoredToken: vi.fn(() => null) }
})

vi.mock('@/services/api/social-api', () => ({
  sendEncouragementApi: vi.fn(),
  sendNudgeApi: vi.fn(),
  sendRecapDismissalApi: vi.fn(),
}))

import { isBackendSocialEnabled } from '@/lib/env'
import { getStoredToken } from '@/lib/auth-storage'
import {
  sendEncouragementApi,
  sendNudgeApi,
  sendRecapDismissalApi,
} from '@/services/api/social-api'
const FRIEND_ID = 'friend-sarah-m'
const FRIEND_NAME = 'Sarah M.'

const MOCK_FRIEND: FriendProfile = {
  id: FRIEND_ID,
  displayName: FRIEND_NAME,
  avatar: '',
  level: 4,
  levelName: 'Flourishing',
  currentStreak: 45,
  faithPoints: 3200,
  weeklyPoints: 145,
  lastActive: new Date().toISOString(),
}

function seedFriends() {
  const data: FriendsData = {
    friends: [MOCK_FRIEND],
    pendingIncoming: [],
    pendingOutgoing: [],
    blocked: [],
  }
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(data))
}

describe('useSocialInteractions — Spec 2.5.4b dual-write', () => {
  beforeEach(() => {
    cleanup() // unmount React components before clearing storage
    localStorage.clear()
    vi.mocked(isBackendSocialEnabled).mockReturnValue(false)
    vi.mocked(getStoredToken).mockReturnValue(null)
    vi.mocked(sendEncouragementApi).mockReset().mockResolvedValue({
      id: 'srv-1', createdAt: '2026-04-27T00:00:00Z',
    })
    vi.mocked(sendNudgeApi).mockReset().mockResolvedValue({
      id: 'srv-1', createdAt: '2026-04-27T00:00:00Z',
    })
    vi.mocked(sendRecapDismissalApi).mockReset().mockResolvedValue({
      id: 'srv-1', createdAt: '2026-04-27T00:00:00Z',
    })
  })

  it('flag-off: sendEncouragement does not call backend', () => {
    seedFriends()
    vi.mocked(isBackendSocialEnabled).mockReturnValue(false)
    vi.mocked(getStoredToken).mockReturnValue('jwt-xyz')
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendEncouragement(FRIEND_ID, FRIEND_NAME, 'Praying for you')
    })
    expect(sendEncouragementApi).not.toHaveBeenCalled()
    const data = JSON.parse(localStorage.getItem(SOCIAL_KEY)!)
    expect(data.encouragements).toHaveLength(1)
  })

  it('flag-on + JWT: sendEncouragement calls backend with correct args', () => {
    seedFriends()
    vi.mocked(isBackendSocialEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-xyz')
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendEncouragement(FRIEND_ID, FRIEND_NAME, 'Praying for you')
    })
    expect(sendEncouragementApi).toHaveBeenCalledTimes(1)
    expect(sendEncouragementApi).toHaveBeenCalledWith(FRIEND_ID, 'Praying for you')
  })

  it('flag-on + no JWT (simulated auth): sendEncouragement does not call backend', () => {
    seedFriends()
    vi.mocked(isBackendSocialEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue(null)
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendEncouragement(FRIEND_ID, FRIEND_NAME, 'Praying for you')
    })
    expect(sendEncouragementApi).not.toHaveBeenCalled()
  })

  it('sendEncouragement: backend failure is swallowed (localStorage row still present)', async () => {
    seedFriends()
    vi.mocked(isBackendSocialEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-xyz')
    vi.mocked(sendEncouragementApi).mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendEncouragement(FRIEND_ID, FRIEND_NAME, 'Praying for you')
    })
    await new Promise((r) => setTimeout(r, 0))
    const data = JSON.parse(localStorage.getItem(SOCIAL_KEY)!)
    expect(data.encouragements).toHaveLength(1)
  })

  it('flag-off: sendNudge does not call backend', () => {
    vi.mocked(isBackendSocialEnabled).mockReturnValue(false)
    vi.mocked(getStoredToken).mockReturnValue('jwt-xyz')
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendNudge(FRIEND_ID, FRIEND_NAME)
    })
    expect(sendNudgeApi).not.toHaveBeenCalled()
  })

  it('flag-on + JWT: sendNudge calls backend with toUserId', () => {
    vi.mocked(isBackendSocialEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-xyz')
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendNudge(FRIEND_ID, FRIEND_NAME)
    })
    expect(sendNudgeApi).toHaveBeenCalledTimes(1)
    expect(sendNudgeApi).toHaveBeenCalledWith(FRIEND_ID)
  })

  it('flag-off: dismissRecap does not call backend', () => {
    vi.mocked(isBackendSocialEnabled).mockReturnValue(false)
    vi.mocked(getStoredToken).mockReturnValue('jwt-xyz')
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.dismissRecap()
    })
    expect(sendRecapDismissalApi).not.toHaveBeenCalled()
  })

  it('flag-on + JWT: dismissRecap calls backend with weekStart from getCurrentWeekStart', () => {
    vi.mocked(isBackendSocialEnabled).mockReturnValue(true)
    vi.mocked(getStoredToken).mockReturnValue('jwt-xyz')
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.dismissRecap()
    })
    expect(sendRecapDismissalApi).toHaveBeenCalledTimes(1)
    const callArg = vi.mocked(sendRecapDismissalApi).mock.calls[0][0]
    expect(callArg).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
