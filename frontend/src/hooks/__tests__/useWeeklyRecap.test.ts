import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useWeeklyRecap } from '../useWeeklyRecap'
import { SOCIAL_KEY } from '@/services/social-storage'
import { FRIENDS_KEY } from '@/services/friends-storage'
import { getCurrentWeekStart } from '@/utils/date'
import type { FriendsData, FriendProfile } from '@/types/dashboard'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { name: 'Eric', id: 'user-1' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

const MOCK_FRIEND: FriendProfile = {
  id: 'friend-1',
  displayName: 'Sarah M.',
  avatar: '',
  level: 4,
  levelName: 'Flourishing',
  currentStreak: 45,
  faithPoints: 3200,
  weeklyPoints: 145,
  lastActive: new Date().toISOString(),
}

function seedFriends(count: number = 5) {
  const data: FriendsData = {
    friends: Array.from({ length: count }, (_, i) => ({
      ...MOCK_FRIEND,
      id: `friend-${i}`,
      displayName: `Friend ${i}`,
    })),
    pendingIncoming: [],
    pendingOutgoing: [],
    blocked: [],
  }
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(data))
}

function resetState() {
  cleanup()
  localStorage.clear()
}

describe('useWeeklyRecap', () => {
  beforeEach(resetState)
  afterEach(resetState)

  it('isVisible returns true when not dismissed and has friends', () => {
    seedFriends()
    const { result } = renderHook(() => useWeeklyRecap())
    expect(result.current.isVisible).toBe(true)
  })

  it('isVisible returns false when dismissed this week', () => {
    seedFriends()
    const weekStart = getCurrentWeekStart()
    localStorage.setItem(
      SOCIAL_KEY,
      JSON.stringify({ encouragements: [], nudges: [], recapDismissals: [weekStart] }),
    )
    const { result } = renderHook(() => useWeeklyRecap())
    expect(result.current.isVisible).toBe(false)
  })

  it('isVisible resets for new week', () => {
    seedFriends()
    // Dismiss for a past week
    localStorage.setItem(
      SOCIAL_KEY,
      JSON.stringify({ encouragements: [], nudges: [], recapDismissals: ['2025-01-06'] }),
    )
    const { result } = renderHook(() => useWeeklyRecap())
    expect(result.current.isVisible).toBe(true)
  })

  it('hasFriends reflects friend count', () => {
    // 0 friends
    seedFriends(0)
    const { result: r1 } = renderHook(() => useWeeklyRecap())
    expect(r1.current.hasFriends).toBe(false)

    cleanup()
    localStorage.clear()

    // 5 friends
    seedFriends(5)
    const { result: r2 } = renderHook(() => useWeeklyRecap())
    expect(r2.current.hasFriends).toBe(true)
  })

  it('userContributionPercent computed correctly', () => {
    seedFriends()
    // Seed some activities for the current week
    const weekStart = getCurrentWeekStart()
    localStorage.setItem(
      'wr_daily_activities',
      JSON.stringify({
        [weekStart]: {
          mood: true,
          pray: true,
          listen: false,
          prayerWall: false,
          readingPlan: false,
          meditate: false,
          journal: false,
          pointsEarned: 15,
          multiplier: 1,
        },
      }),
    )
    const { result } = renderHook(() => useWeeklyRecap())
    // User did 2 activities, group total is 64, so 2/(2+64) ≈ 3%
    expect(result.current.userContributionPercent).toBe(3)
  })

  it('dismiss stores week start in recapDismissals', () => {
    seedFriends()
    const { result } = renderHook(() => useWeeklyRecap())
    act(() => {
      result.current.dismiss()
    })
    const data = JSON.parse(localStorage.getItem(SOCIAL_KEY)!)
    expect(data.recapDismissals).toContain(getCurrentWeekStart())
    expect(result.current.isVisible).toBe(false)
  })

  it('stats contain mock group data', () => {
    seedFriends()
    const { result } = renderHook(() => useWeeklyRecap())
    expect(result.current.stats.prayers).toBe(23)
    expect(result.current.stats.journals).toBe(15)
    expect(result.current.stats.meditations).toBe(8)
    expect(result.current.stats.worshipHours).toBe(12)
  })
})
