import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useReadingPlanProgress } from '../useReadingPlanProgress'
import { READING_PLAN_PROGRESS_KEY } from '@/constants/reading-plans'

// Default: not authenticated
const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

describe('useReadingPlanProgress', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
  })

  it('returns empty progress when no data in localStorage', () => {
    const { result } = renderHook(() => useReadingPlanProgress())
    expect(result.current.progress).toEqual({})
  })

  it('startPlan no-ops when not authenticated', () => {
    const { result } = renderHook(() => useReadingPlanProgress())
    act(() => result.current.startPlan('finding-peace-in-anxiety'))
    expect(result.current.progress).toEqual({})
    expect(localStorage.getItem(READING_PLAN_PROGRESS_KEY)).toBeNull()
  })

  it('startPlan creates correct progress entry when authenticated', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useReadingPlanProgress())

    act(() => result.current.startPlan('finding-peace-in-anxiety'))

    const progress = result.current.getProgress('finding-peace-in-anxiety')
    expect(progress).toBeDefined()
    expect(progress?.currentDay).toBe(1)
    expect(progress?.completedDays).toEqual([])
    expect(progress?.completedAt).toBeNull()
    expect(progress?.startedAt).toBeTruthy()
  })

  it('completeDay no-ops when not authenticated', () => {
    // Seed progress directly in localStorage (as if started while authenticated)
    localStorage.setItem(
      READING_PLAN_PROGRESS_KEY,
      JSON.stringify({
        'finding-peace-in-anxiety': {
          startedAt: '2026-01-01T00:00:00.000Z',
          currentDay: 1,
          completedDays: [],
          completedAt: null,
        },
      }),
    )

    // Render as unauthenticated
    mockAuth.isAuthenticated = false
    const { result } = renderHook(() => useReadingPlanProgress())

    act(() => result.current.completeDay('finding-peace-in-anxiety', 1))

    const progress = result.current.getProgress('finding-peace-in-anxiety')
    expect(progress?.completedDays).toEqual([])
  })

  it('completeDay adds day to completedDays and advances currentDay', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useReadingPlanProgress())

    act(() => result.current.startPlan('finding-peace-in-anxiety'))
    act(() => result.current.completeDay('finding-peace-in-anxiety', 1))

    const progress = result.current.getProgress('finding-peace-in-anxiety')
    expect(progress?.completedDays).toEqual([1])
    expect(progress?.currentDay).toBe(2)
  })

  it('completeDay does not duplicate days', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useReadingPlanProgress())

    act(() => result.current.startPlan('finding-peace-in-anxiety'))
    act(() => result.current.completeDay('finding-peace-in-anxiety', 1))
    act(() => result.current.completeDay('finding-peace-in-anxiety', 1))

    const progress = result.current.getProgress('finding-peace-in-anxiety')
    expect(progress?.completedDays).toEqual([1])
  })

  it('completeDay sets completedAt on last day of a plan', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useReadingPlanProgress())

    act(() => result.current.startPlan('finding-peace-in-anxiety'))

    // Complete all 7 days
    for (let i = 1; i <= 7; i++) {
      act(() => result.current.completeDay('finding-peace-in-anxiety', i))
    }

    const progress = result.current.getProgress('finding-peace-in-anxiety')
    expect(progress?.completedAt).toBeTruthy()
    expect(progress?.completedDays).toHaveLength(7)
  })

  it('getActivePlanId returns most recently started non-completed plan', () => {
    // Seed two plans with known timestamps where the second is later
    localStorage.setItem(
      READING_PLAN_PROGRESS_KEY,
      JSON.stringify({
        'finding-peace-in-anxiety': {
          startedAt: '2026-01-01T00:00:00.000Z',
          currentDay: 1,
          completedDays: [],
          completedAt: null,
        },
        'the-gratitude-reset': {
          startedAt: '2026-01-02T00:00:00.000Z',
          currentDay: 1,
          completedDays: [],
          completedAt: null,
        },
      }),
    )

    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useReadingPlanProgress())

    expect(result.current.getActivePlanId()).toBe('the-gratitude-reset')
  })

  it('getPlanStatus returns correct states', () => {
    // Seed progress with known states
    localStorage.setItem(
      READING_PLAN_PROGRESS_KEY,
      JSON.stringify({
        'finding-peace-in-anxiety': {
          startedAt: '2026-01-01T00:00:00.000Z',
          currentDay: 1,
          completedDays: [],
          completedAt: null,
        },
        'the-gratitude-reset': {
          startedAt: '2026-01-02T00:00:00.000Z',
          currentDay: 7,
          completedDays: [1, 2, 3, 4, 5, 6, 7],
          completedAt: '2026-01-09T00:00:00.000Z',
        },
        'walking-through-grief': {
          startedAt: '2026-01-03T00:00:00.000Z',
          currentDay: 3,
          completedDays: [1, 2],
          completedAt: null,
        },
      }),
    )

    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useReadingPlanProgress())

    // walking-through-grief has the latest startedAt and is not completed -> active
    expect(result.current.getPlanStatus('walking-through-grief')).toBe('active')

    // finding-peace-in-anxiety is started but not the latest -> paused
    expect(result.current.getPlanStatus('finding-peace-in-anxiety')).toBe(
      'paused',
    )

    // the-gratitude-reset has completedAt -> completed
    expect(result.current.getPlanStatus('the-gratitude-reset')).toBe(
      'completed',
    )

    // learning-to-trust-god is not in progress -> unstarted
    expect(result.current.getPlanStatus('learning-to-trust-god')).toBe(
      'unstarted',
    )
  })

  it('persists progress across hook re-renders', () => {
    mockAuth.isAuthenticated = true
    const { result, rerender } = renderHook(() => useReadingPlanProgress())

    act(() => result.current.startPlan('finding-peace-in-anxiety'))

    rerender()

    const progress = result.current.getProgress('finding-peace-in-anxiety')
    expect(progress).toBeDefined()
    expect(progress?.currentDay).toBe(1)
  })
})
