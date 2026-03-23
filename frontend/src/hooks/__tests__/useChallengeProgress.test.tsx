import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CHALLENGE_PROGRESS_KEY, CHALLENGE_REMINDERS_KEY } from '@/constants/challenges'

import { useChallengeProgress } from '../useChallengeProgress'

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
})
