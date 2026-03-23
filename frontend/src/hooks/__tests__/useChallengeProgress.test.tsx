import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CHALLENGE_PROGRESS_KEY, CHALLENGE_REMINDERS_KEY } from '@/constants/challenges'

import { useChallengeProgress } from '../useChallengeProgress'
import type { CompletionResult } from '../useChallengeProgress'

const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

describe('useChallengeProgress', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
  })

  it('joinChallenge creates progress entry when authenticated', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))

    const progress = result.current.getProgress('pray40-lenten-journey')
    expect(progress).toBeDefined()
    expect(progress?.currentDay).toBe(1)
    expect(progress?.completedDays).toEqual([])
    expect(progress?.completedAt).toBeNull()
    expect(progress?.joinedAt).toBeTruthy()
  })

  it('joinChallenge no-ops when not authenticated', () => {
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))

    expect(result.current.getProgress('pray40-lenten-journey')).toBeUndefined()
    expect(localStorage.getItem(CHALLENGE_PROGRESS_KEY)).toBeNull()
  })

  it('completeDay advances currentDay', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))
    act(() => result.current.completeDay('pray40-lenten-journey', 1))

    const progress = result.current.getProgress('pray40-lenten-journey')
    expect(progress?.currentDay).toBe(2)
  })

  it('completeDay adds to completedDays', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))
    act(() => result.current.completeDay('pray40-lenten-journey', 1))

    const progress = result.current.getProgress('pray40-lenten-journey')
    expect(progress?.completedDays).toEqual([1])
  })

  it('completeDay sets completedAt on final day', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    // Use a short challenge (7 days) for this test
    act(() => result.current.joinChallenge('easter-joy-resurrection-hope'))
    for (let day = 1; day <= 7; day++) {
      act(() => result.current.completeDay('easter-joy-resurrection-hope', day))
    }

    const progress = result.current.getProgress('easter-joy-resurrection-hope')
    expect(progress?.completedAt).toBeTruthy()
    expect(progress?.completedDays).toHaveLength(7)
  })

  it('completeDay no-ops for wrong day (not current day)', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))
    // Try to complete day 5 when current day is 1
    act(() => result.current.completeDay('pray40-lenten-journey', 5))

    const progress = result.current.getProgress('pray40-lenten-journey')
    expect(progress?.completedDays).toEqual([])
    expect(progress?.currentDay).toBe(1)
  })

  it('completeDay no-ops for already completed day', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))
    act(() => result.current.completeDay('pray40-lenten-journey', 1))
    // Try to complete day 1 again (currentDay is now 2, so this also fails the wrong-day check)
    act(() => result.current.completeDay('pray40-lenten-journey', 1))

    const progress = result.current.getProgress('pray40-lenten-journey')
    expect(progress?.completedDays).toEqual([1])
  })

  it('isChallengeJoined returns false for unknown challenge', () => {
    const { result } = renderHook(() => useChallengeProgress())
    expect(result.current.isChallengeJoined('nonexistent')).toBe(false)
  })

  it('isChallengeJoined returns true after joining', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))
    expect(result.current.isChallengeJoined('pray40-lenten-journey')).toBe(true)
  })

  it('isChallengeCompleted returns true when all days done', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('easter-joy-resurrection-hope'))
    for (let day = 1; day <= 7; day++) {
      act(() => result.current.completeDay('easter-joy-resurrection-hope', day))
    }

    expect(result.current.isChallengeCompleted('easter-joy-resurrection-hope')).toBe(true)
  })

  it('toggleReminder adds reminder when authenticated', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.toggleReminder('advent-awaits'))

    expect(result.current.getReminders()).toContain('advent-awaits')
  })

  it('toggleReminder removes existing reminder', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.toggleReminder('advent-awaits'))
    act(() => result.current.toggleReminder('advent-awaits'))

    expect(result.current.getReminders()).not.toContain('advent-awaits')
  })

  it('toggleReminder no-ops when not authenticated', () => {
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.toggleReminder('advent-awaits'))

    expect(result.current.getReminders()).toEqual([])
    expect(localStorage.getItem(CHALLENGE_REMINDERS_KEY)).toBeNull()
  })

  it('tracks multiple challenges simultaneously', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))
    act(() => result.current.joinChallenge('easter-joy-resurrection-hope'))

    expect(result.current.isChallengeJoined('pray40-lenten-journey')).toBe(true)
    expect(result.current.isChallengeJoined('easter-joy-resurrection-hope')).toBe(true)
  })

  it('progress persists across hook re-instantiation', () => {
    mockAuth.isAuthenticated = true
    const { result: result1 } = renderHook(() => useChallengeProgress())

    act(() => result1.current.joinChallenge('pray40-lenten-journey'))
    act(() => result1.current.completeDay('pray40-lenten-journey', 1))

    // Re-render a fresh hook (reads from localStorage)
    const { result: result2 } = renderHook(() => useChallengeProgress())
    const progress = result2.current.getProgress('pray40-lenten-journey')
    expect(progress?.currentDay).toBe(2)
    expect(progress?.completedDays).toEqual([1])
  })

  // --- Spec 2: New fields ---

  it('joinChallenge creates entry with status, streak, missedDays', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))

    const progress = result.current.getProgress('pray40-lenten-journey')
    expect(progress?.status).toBe('active')
    expect(progress?.streak).toBe(0)
    expect(progress?.missedDays).toEqual([])
  })

  it('completeDay increments streak on consecutive days', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))
    act(() => result.current.completeDay('pray40-lenten-journey', 1))

    expect(result.current.getProgress('pray40-lenten-journey')?.streak).toBe(1)

    act(() => result.current.completeDay('pray40-lenten-journey', 2))
    expect(result.current.getProgress('pray40-lenten-journey')?.streak).toBe(2)
  })

  it('completeDay calls recordActivity with challenge and actionType', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())
    const mockRecordActivity = vi.fn()

    act(() => result.current.joinChallenge('pray40-lenten-journey'))
    act(() => {
      result.current.completeDay('pray40-lenten-journey', 1, mockRecordActivity)
    })

    expect(mockRecordActivity).toHaveBeenCalledWith('challenge')
    // Day 1 of lent challenge has actionType 'pray'
    expect(mockRecordActivity).toHaveBeenCalledWith('pray')
  })

  it('completeDay sets status completed on final day', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('easter-joy-resurrection-hope'))
    for (let day = 1; day <= 7; day++) {
      act(() => result.current.completeDay('easter-joy-resurrection-hope', day))
    }

    expect(result.current.getProgress('easter-joy-resurrection-hope')?.status).toBe('completed')
  })

  it('completeDay awards 100 bonus points on completion', () => {
    mockAuth.isAuthenticated = true
    // Seed initial faith points
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 50, currentLevel: 1, currentLevelName: 'Seedling',
      pointsToNextLevel: 50, lastUpdated: new Date().toISOString(),
    }))

    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('easter-joy-resurrection-hope'))
    for (let day = 1; day <= 7; day++) {
      act(() => result.current.completeDay('easter-joy-resurrection-hope', day))
    }

    const fp = JSON.parse(localStorage.getItem('wr_faith_points')!)
    expect(fp.totalPoints).toBe(150) // 50 + 100 bonus
  })

  it('completeDay returns isCompletion true on final day', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())
    let completionResult: CompletionResult = { isCompletion: false, bonusPoints: 0, newBadgeIds: [] }

    act(() => result.current.joinChallenge('easter-joy-resurrection-hope'))
    for (let day = 1; day <= 6; day++) {
      act(() => {
        completionResult = result.current.completeDay('easter-joy-resurrection-hope', day)
      })
    }
    expect(completionResult.isCompletion).toBe(false)

    act(() => {
      completionResult = result.current.completeDay('easter-joy-resurrection-hope', 7)
    })
    expect(completionResult.isCompletion).toBe(true)
    expect(completionResult.bonusPoints).toBe(100)
  })

  it('completeDay is idempotent', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())
    const mockRecordActivity = vi.fn()

    act(() => result.current.joinChallenge('pray40-lenten-journey'))
    act(() => result.current.completeDay('pray40-lenten-journey', 1, mockRecordActivity))
    mockRecordActivity.mockClear()

    // Try again
    act(() => result.current.completeDay('pray40-lenten-journey', 1, mockRecordActivity))
    expect(mockRecordActivity).not.toHaveBeenCalled()
  })

  it('completeDay no-ops when not authenticated', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())
    act(() => result.current.joinChallenge('pray40-lenten-journey'))

    mockAuth.isAuthenticated = false
    const { result: result2 } = renderHook(() => useChallengeProgress())
    const mockRecordActivity = vi.fn()
    act(() => {
      result2.current.completeDay('pray40-lenten-journey', 1, mockRecordActivity)
    })
    expect(mockRecordActivity).not.toHaveBeenCalled()
  })

  // --- getActiveChallenge ---

  it('getActiveChallenge returns active entry', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))

    const active = result.current.getActiveChallenge()
    expect(active).toBeDefined()
    expect(active?.challengeId).toBe('pray40-lenten-journey')
    expect(active?.progress.status).toBe('active')
  })

  it('getActiveChallenge returns undefined when no active', () => {
    const { result } = renderHook(() => useChallengeProgress())
    expect(result.current.getActiveChallenge()).toBeUndefined()
  })

  // --- pauseChallenge / resumeChallenge ---

  it('pauseChallenge sets status paused', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))
    act(() => result.current.pauseChallenge('pray40-lenten-journey'))

    expect(result.current.getProgress('pray40-lenten-journey')?.status).toBe('paused')
    expect(result.current.getActiveChallenge()).toBeUndefined()
  })

  it('resumeChallenge sets status active', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useChallengeProgress())

    act(() => result.current.joinChallenge('pray40-lenten-journey'))
    act(() => result.current.pauseChallenge('pray40-lenten-journey'))
    act(() => result.current.resumeChallenge('pray40-lenten-journey'))

    expect(result.current.getProgress('pray40-lenten-journey')?.status).toBe('active')
  })

  // --- Migration ---

  it('migration backfills status/streak/missedDays for legacy entries', () => {
    // Write a legacy entry without new fields
    localStorage.setItem(CHALLENGE_PROGRESS_KEY, JSON.stringify({
      'pray40-lenten-journey': {
        joinedAt: '2026-01-01',
        currentDay: 3,
        completedDays: [1, 2],
        completedAt: null,
      },
    }))

    const { result } = renderHook(() => useChallengeProgress())
    const progress = result.current.getProgress('pray40-lenten-journey')

    expect(progress?.status).toBe('active')
    expect(progress?.streak).toBe(0)
    expect(progress?.missedDays).toEqual([])
  })

  it('migration sets status completed for legacy completed entries', () => {
    localStorage.setItem(CHALLENGE_PROGRESS_KEY, JSON.stringify({
      'easter-joy-resurrection-hope': {
        joinedAt: '2026-01-01',
        currentDay: 7,
        completedDays: [1, 2, 3, 4, 5, 6, 7],
        completedAt: '2026-01-08',
      },
    }))

    const { result } = renderHook(() => useChallengeProgress())
    const progress = result.current.getProgress('easter-joy-resurrection-hope')

    expect(progress?.status).toBe('completed')
  })

  // --- Challenge badge award ---

  it('completeDay awards challenge-specific badge on completion', () => {
    mockAuth.isAuthenticated = true
    // Initialize badges
    localStorage.setItem('wr_badges', JSON.stringify({
      earned: { welcome: { earnedAt: '2026-01-01' } },
      newlyEarned: [],
      activityCounts: {
        pray: 0, journal: 0, meditate: 0, listen: 0, prayerWall: 0,
        readingPlan: 0, gratitude: 0, reflection: 0, encouragementsSent: 0,
        fullWorshipDays: 0, challengesCompleted: 0,
      },
    }))

    const { result } = renderHook(() => useChallengeProgress())
    let completionResult: CompletionResult = { isCompletion: false, bonusPoints: 0, newBadgeIds: [] }

    act(() => result.current.joinChallenge('easter-joy-resurrection-hope'))
    for (let day = 1; day <= 7; day++) {
      act(() => {
        completionResult = result.current.completeDay('easter-joy-resurrection-hope', day)
      })
    }

    expect(completionResult.newBadgeIds).toContain('challenge_easter')
    expect(completionResult.newBadgeIds).toContain('challenge_first')

    // Verify persisted to badge data
    const badges = JSON.parse(localStorage.getItem('wr_badges')!)
    expect(badges.earned['challenge_easter']).toBeDefined()
    expect(badges.earned['challenge_first']).toBeDefined()
    expect(badges.activityCounts.challengesCompleted).toBe(1)
  })
})
