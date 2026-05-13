import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePraySession } from '../usePraySession'

const mockRecordActivity = vi.fn()
const mockMarkPrayComplete = vi.fn()

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    recordActivity: mockRecordActivity,
    // Stub the rest of the return shape so consumers that destructure don't crash.
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: {},
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    newlyEarnedBadges: [],
    previousStreak: null,
    isFreeRepairAvailable: false,
    clearNewlyEarnedBadges: vi.fn(),
    repairStreak: vi.fn(),
  }),
}))

vi.mock('@/hooks/useCompletionTracking', () => ({
  useCompletionTracking: () => ({
    completion: { date: '', pray: false, journal: false, meditate: { completed: false, types: [] }, guidedPrayer: [] },
    markPrayComplete: mockMarkPrayComplete,
    markJournalComplete: vi.fn(),
    markMeditationComplete: vi.fn(),
    markGuidedPrayerComplete: vi.fn(),
    isPrayComplete: false,
    isJournalComplete: false,
    isMeditateComplete: false,
    completedMeditationTypes: [],
    completedGuidedPrayerSessions: [],
    isGuidedPrayerComplete: () => false,
  }),
}))

describe('usePraySession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in fading-in phase with the first fixed prompt visible at index 0', () => {
    const { result } = renderHook(() => usePraySession({ length: 5 }))
    // Synchronous START dispatch in mount effect.
    expect(result.current.phase).toBe('fading-in')
    expect(result.current.promptIndex).toBe(0)
    expect(result.current.totalPrompts).toBe(5)
    expect(result.current.currentPrompt?.fixedPosition).toBe('first')
  })

  it('fires recordActivity with metadata on natural completion of 1-min session', async () => {
    renderHook(() => usePraySession({ length: 1 }))
    // 1-min flow: fade-in 1500 → visible 5000 → fade-out 1500 → silence 25000 →
    // fade-in 1500 → visible 5000 → fade-out 1500 → silence 18000 → amen
    await act(async () => { vi.advanceTimersByTime(1500) }) // fade-in 1
    await act(async () => { vi.advanceTimersByTime(5000) }) // visible 1 (promptsSeen=1)
    await act(async () => { vi.advanceTimersByTime(1500) }) // fade-out 1
    await act(async () => { vi.advanceTimersByTime(25000) }) // silence 1 → next prompt
    await act(async () => { vi.advanceTimersByTime(1500) }) // fade-in 2
    await act(async () => { vi.advanceTimersByTime(5000) }) // visible 2 (promptsSeen=2)
    await act(async () => { vi.advanceTimersByTime(1500) }) // fade-out 2
    await act(async () => { vi.advanceTimersByTime(18000) }) // silence 2 → amen

    expect(mockMarkPrayComplete).toHaveBeenCalledOnce()
    expect(mockRecordActivity).toHaveBeenCalledOnce()
    expect(mockRecordActivity).toHaveBeenCalledWith('pray', 'daily_hub_session', {
      metadata: { length: 1, ended_early: false, prompts_seen: 2, audio_used: false },
    })
  })

  it('endEarly records ended_early=true with prompts_seen reflecting state', async () => {
    const { result } = renderHook(() => usePraySession({ length: 5 }))
    // Advance into the visible phase of prompt 1 (promptsSeen=1).
    await act(async () => { vi.advanceTimersByTime(1500) }) // fade-in → visible
    expect(result.current.promptsSeen).toBe(1)

    act(() => { result.current.endEarly() })

    expect(mockRecordActivity).toHaveBeenCalledOnce()
    expect(mockRecordActivity).toHaveBeenCalledWith('pray', 'daily_hub_session', {
      metadata: { length: 5, ended_early: true, prompts_seen: 1, audio_used: false },
    })
    expect(result.current.phase).toBe('amen')
  })

  it('does NOT double-fire recordActivity on natural-completion-then-unmount', async () => {
    const { unmount } = renderHook(() => usePraySession({ length: 1 }))
    // Step through each phase explicitly so React flushes state between timer fires.
    await act(async () => { vi.advanceTimersByTime(1500) })  // fade-in 1
    await act(async () => { vi.advanceTimersByTime(5000) })  // visible 1
    await act(async () => { vi.advanceTimersByTime(1500) })  // fade-out 1
    await act(async () => { vi.advanceTimersByTime(25000) }) // silence 1
    await act(async () => { vi.advanceTimersByTime(1500) })  // fade-in 2
    await act(async () => { vi.advanceTimersByTime(5000) })  // visible 2
    await act(async () => { vi.advanceTimersByTime(1500) })  // fade-out 2
    await act(async () => { vi.advanceTimersByTime(18000) }) // silence 2 → amen
    expect(mockRecordActivity).toHaveBeenCalledOnce()
    unmount()
    expect(mockRecordActivity).toHaveBeenCalledOnce()
  })

  it('records ended_early=true on unmount before natural completion', async () => {
    const { unmount } = renderHook(() => usePraySession({ length: 10 }))
    // Advance into the visible phase of prompt 1 so promptsSeen=1.
    await act(async () => { vi.advanceTimersByTime(1500) })
    unmount()
    expect(mockRecordActivity).toHaveBeenCalledOnce()
    expect(mockRecordActivity).toHaveBeenCalledWith('pray', 'daily_hub_session', {
      metadata: { length: 10, ended_early: true, prompts_seen: 1, audio_used: false },
    })
  })
})
