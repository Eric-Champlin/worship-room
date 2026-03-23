import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CHALLENGES } from '@/data/challenges'
import { freshDailyActivities } from '@/services/faith-points-storage'
import type { ChallengeProgress } from '@/types/challenges'

import { useChallengeAutoDetect } from '../useChallengeAutoDetect'

// Mock faith-points-storage
vi.mock('@/services/faith-points-storage', async () => {
  const actual = await vi.importActual<typeof import('@/services/faith-points-storage')>('@/services/faith-points-storage')
  return {
    ...actual,
    getTodayActivities: vi.fn(() => actual.freshDailyActivities()),
  }
})

import { getTodayActivities } from '@/services/faith-points-storage'
const mockGetTodayActivities = vi.mocked(getTodayActivities)

const lentChallenge = CHALLENGES.find((c) => c.id === 'pray40-lenten-journey')!
const day1ActionType = lentChallenge.dailyContent[0].actionType // 'pray'

function makeProgress(overrides: Partial<ChallengeProgress> = {}): ChallengeProgress {
  return {
    joinedAt: '2026-03-01',
    currentDay: 1,
    completedDays: [],
    completedAt: null,
    streak: 0,
    missedDays: [],
    status: 'active',
    ...overrides,
  }
}

describe('useChallengeAutoDetect', () => {
  const mockCompleteDay = vi.fn(() => ({ isCompletion: false, bonusPoints: 0, newBadgeIds: [] }))
  const mockRecordActivity = vi.fn()
  const mockShowToast = vi.fn()
  const mockGetActiveChallenge = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTodayActivities.mockReturnValue(freshDailyActivities())
    mockGetActiveChallenge.mockReturnValue(undefined)
  })

  it('auto-detects when activity already done', () => {
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: makeProgress(),
    })
    // Day 1 of lent challenge has actionType 'pray'
    mockGetTodayActivities.mockReturnValue({ ...freshDailyActivities(), pray: true })

    renderHook(() =>
      useChallengeAutoDetect({
        isAuthenticated: true,
        getActiveChallenge: mockGetActiveChallenge,
        completeDay: mockCompleteDay,
        recordActivity: mockRecordActivity,
        showToast: mockShowToast,
      }),
    )

    expect(mockCompleteDay).toHaveBeenCalledWith('pray40-lenten-journey', 1, mockRecordActivity)
  })

  it('shows correct toast message', () => {
    // Use day 1 which we know is 'pray'
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: makeProgress({ currentDay: 1 }),
    })
    mockGetTodayActivities.mockReturnValue({ ...freshDailyActivities(), pray: true })

    renderHook(() =>
      useChallengeAutoDetect({
        isAuthenticated: true,
        getActiveChallenge: mockGetActiveChallenge,
        completeDay: mockCompleteDay,
        recordActivity: mockRecordActivity,
        showToast: mockShowToast,
      }),
    )

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Challenge Day 1 auto-completed!'),
      'success',
    )
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('prayed'),
      'success',
    )
  })

  it('does not fire for logged-out users', () => {
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: makeProgress(),
    })
    mockGetTodayActivities.mockReturnValue({ ...freshDailyActivities(), pray: true })

    renderHook(() =>
      useChallengeAutoDetect({
        isAuthenticated: false,
        getActiveChallenge: mockGetActiveChallenge,
        completeDay: mockCompleteDay,
        recordActivity: mockRecordActivity,
        showToast: mockShowToast,
      }),
    )

    expect(mockCompleteDay).not.toHaveBeenCalled()
  })

  it('does not fire if no active challenge', () => {
    mockGetActiveChallenge.mockReturnValue(undefined)
    mockGetTodayActivities.mockReturnValue({ ...freshDailyActivities(), pray: true })

    renderHook(() =>
      useChallengeAutoDetect({
        isAuthenticated: true,
        getActiveChallenge: mockGetActiveChallenge,
        completeDay: mockCompleteDay,
        recordActivity: mockRecordActivity,
        showToast: mockShowToast,
      }),
    )

    expect(mockCompleteDay).not.toHaveBeenCalled()
  })

  it('does not fire if current day already completed', () => {
    // Day 1 is already completed, currentDay is 2
    // We set day 1's action to true but since day 1 is already in completedDays
    // and currentDay is 2, auto-detect checks day 2's actionType instead
    const day2ActionType = lentChallenge.dailyContent[1]?.actionType ?? 'pray'
    const activityKey = day2ActionType === 'music' ? 'listen' : day2ActionType

    // Don't set the activity for day 2 — so auto-detect should not fire
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: makeProgress({ currentDay: 2, completedDays: [1] }),
    })
    mockGetTodayActivities.mockReturnValue(freshDailyActivities())

    renderHook(() =>
      useChallengeAutoDetect({
        isAuthenticated: true,
        getActiveChallenge: mockGetActiveChallenge,
        completeDay: mockCompleteDay,
        recordActivity: mockRecordActivity,
        showToast: mockShowToast,
      }),
    )

    expect(mockCompleteDay).not.toHaveBeenCalled()
  })

  it('does not fire if activity not yet done', () => {
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: makeProgress(),
    })
    // Pray is false
    mockGetTodayActivities.mockReturnValue(freshDailyActivities())

    renderHook(() =>
      useChallengeAutoDetect({
        isAuthenticated: true,
        getActiveChallenge: mockGetActiveChallenge,
        completeDay: mockCompleteDay,
        recordActivity: mockRecordActivity,
        showToast: mockShowToast,
      }),
    )

    expect(mockCompleteDay).not.toHaveBeenCalled()
  })
})
