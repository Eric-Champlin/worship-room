import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useSocialInteractions } from '../useSocialInteractions'
import { SOCIAL_KEY, NOTIFICATIONS_KEY } from '@/services/social-storage'
import { FRIENDS_KEY } from '@/services/friends-storage'
import type { FriendsData, FriendProfile } from '@/types/dashboard'

const MOCK_USER = { name: 'Eric', id: 'user-1' }
const FRIEND_ID = 'friend-sarah-m'
const FRIEND_NAME = 'Sarah M.'

const mockAuth = vi.fn(() => ({
  isAuthenticated: true,
  user: MOCK_USER,
  login: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth(),
}))

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

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function resetState() {
  cleanup()
  localStorage.clear()
  mockAuth.mockReturnValue({
    isAuthenticated: true,
    user: MOCK_USER,
    login: vi.fn(),
    logout: vi.fn(),
  })
}

describe('useSocialInteractions', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('no-ops when not authenticated', () => {
    mockAuth.mockReturnValue({
      isAuthenticated: false,
      user: null as unknown as { name: string; id: string },
      login: vi.fn(),
      logout: vi.fn(),
    })
    seedFriends()
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendEncouragement(FRIEND_ID, FRIEND_NAME, 'Keep going!')
    })
    expect(localStorage.getItem(SOCIAL_KEY)).toBeNull()
  })

  it('sendEncouragement stores data and notification', () => {
    seedFriends()
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendEncouragement(FRIEND_ID, FRIEND_NAME, 'Keep going!')
    })
    const data = JSON.parse(localStorage.getItem(SOCIAL_KEY)!)
    expect(data.encouragements).toHaveLength(1)
    expect(data.encouragements[0].message).toBe('Keep going!')

    const notifs = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)!)
    expect(notifs).toHaveLength(1)
    expect(notifs[0].type).toBe('encouragement')
  })

  it('sendEncouragement respects 3/day limit', () => {
    seedFriends()
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendEncouragement(FRIEND_ID, FRIEND_NAME, 'Msg 1')
      result.current.sendEncouragement(FRIEND_ID, FRIEND_NAME, 'Msg 2')
      result.current.sendEncouragement(FRIEND_ID, FRIEND_NAME, 'Msg 3')
      result.current.sendEncouragement(FRIEND_ID, FRIEND_NAME, 'Msg 4') // should be no-op
    })
    const data = JSON.parse(localStorage.getItem(SOCIAL_KEY)!)
    expect(data.encouragements).toHaveLength(3)
  })

  it('sendNudge stores data and notification', () => {
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendNudge(FRIEND_ID, FRIEND_NAME)
    })
    const data = JSON.parse(localStorage.getItem(SOCIAL_KEY)!)
    expect(data.nudges).toHaveLength(1)
    expect(data.nudges[0].toUserId).toBe(FRIEND_ID)
  })

  it('sendNudge respects 7-day cooldown', () => {
    // Pre-seed a recent nudge
    localStorage.setItem(
      SOCIAL_KEY,
      JSON.stringify({
        encouragements: [],
        nudges: [{ id: 'n1', fromUserId: MOCK_USER.id, toUserId: FRIEND_ID, timestamp: daysAgoISO(3) }],
        recapDismissals: [],
      }),
    )
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendNudge(FRIEND_ID, FRIEND_NAME)
    })
    const data = JSON.parse(localStorage.getItem(SOCIAL_KEY)!)
    // Should still be just 1 nudge (the original)
    expect(data.nudges).toHaveLength(1)
  })

  it('canEncourage returns correct boolean', () => {
    const { result } = renderHook(() => useSocialInteractions())
    expect(result.current.canEncourage(FRIEND_ID)).toBe(true)
  })

  it('canNudge returns correct boolean', () => {
    const { result } = renderHook(() => useSocialInteractions())
    // Use a different friend ID to avoid leakage from sendNudge test
    expect(result.current.canNudge('friend-canNudge-test')).toBe(true)
  })

  it('sendEncouragement validates friend exists', () => {
    // DON'T seed friends — friend list is empty
    const { result } = renderHook(() => useSocialInteractions())
    act(() => {
      result.current.sendEncouragement(FRIEND_ID, FRIEND_NAME, 'Keep going!')
    })
    // Should not have stored anything because friend doesn't exist
    expect(localStorage.getItem(SOCIAL_KEY)).toBeNull()
  })
})
