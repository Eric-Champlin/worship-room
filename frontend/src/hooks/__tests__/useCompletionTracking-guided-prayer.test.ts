import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCompletionTracking } from '../useCompletionTracking'
import { DAILY_COMPLETION_KEY } from '@/constants/daily-experience'

beforeEach(() => {
  localStorage.clear()
})

describe('useCompletionTracking — guided prayer extensions', () => {
  it('completedGuidedPrayerSessions is empty by default', () => {
    const { result } = renderHook(() => useCompletionTracking())
    expect(result.current.completedGuidedPrayerSessions).toEqual([])
  })

  it('markGuidedPrayerComplete adds session ID', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markGuidedPrayerComplete('morning-offering'))
    expect(result.current.completedGuidedPrayerSessions).toContain(
      'morning-offering'
    )
  })

  it('duplicate marking is idempotent', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markGuidedPrayerComplete('morning-offering'))
    act(() => result.current.markGuidedPrayerComplete('morning-offering'))
    expect(
      result.current.completedGuidedPrayerSessions.filter(
        (id) => id === 'morning-offering'
      )
    ).toHaveLength(1)
  })

  it('isGuidedPrayerComplete returns true for completed session', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markGuidedPrayerComplete('finding-peace'))
    expect(result.current.isGuidedPrayerComplete('finding-peace')).toBe(true)
  })

  it('isGuidedPrayerComplete returns false for non-completed session', () => {
    const { result } = renderHook(() => useCompletionTracking())
    expect(result.current.isGuidedPrayerComplete('finding-peace')).toBe(false)
  })

  it('multiple sessions can be completed in one day', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markGuidedPrayerComplete('morning-offering'))
    act(() => result.current.markGuidedPrayerComplete('finding-peace'))
    act(() => result.current.markGuidedPrayerComplete('healing-prayer'))
    expect(result.current.completedGuidedPrayerSessions).toHaveLength(3)
    expect(result.current.isGuidedPrayerComplete('morning-offering')).toBe(true)
    expect(result.current.isGuidedPrayerComplete('finding-peace')).toBe(true)
    expect(result.current.isGuidedPrayerComplete('healing-prayer')).toBe(true)
  })

  it('daily reset clears guided prayer completions', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markGuidedPrayerComplete('morning-offering'))
    expect(result.current.completedGuidedPrayerSessions).toHaveLength(1)

    // Simulate date change by modifying stored data
    const stored = JSON.parse(
      localStorage.getItem(DAILY_COMPLETION_KEY) ?? '{}'
    )
    stored.date = '2020-01-01'
    localStorage.setItem(DAILY_COMPLETION_KEY, JSON.stringify(stored))

    // Re-mount the hook (simulates page refresh on new day)
    const { result: result2 } = renderHook(() => useCompletionTracking())
    expect(result2.current.completedGuidedPrayerSessions).toEqual([])
  })

  it('backwards compatibility with old data missing guidedPrayer field', () => {
    // Store old-format data without guidedPrayer
    const oldData = {
      date: new Date().toISOString().slice(0, 10),
      pray: true,
      journal: false,
      meditate: { completed: false, types: [] },
    }
    localStorage.setItem(DAILY_COMPLETION_KEY, JSON.stringify(oldData))

    const { result } = renderHook(() => useCompletionTracking())
    expect(result.current.completedGuidedPrayerSessions).toEqual([])
    expect(result.current.isGuidedPrayerComplete('morning-offering')).toBe(false)

    // Can still mark new guided prayer completions
    act(() => result.current.markGuidedPrayerComplete('morning-offering'))
    expect(result.current.completedGuidedPrayerSessions).toContain(
      'morning-offering'
    )
  })

  it('persists guided prayer completions to localStorage', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markGuidedPrayerComplete('evening-surrender'))

    const stored = JSON.parse(
      localStorage.getItem(DAILY_COMPLETION_KEY) ?? '{}'
    )
    expect(stored.guidedPrayer).toContain('evening-surrender')
  })

  it('guided prayer does not affect other completion states', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markGuidedPrayerComplete('morning-offering'))
    expect(result.current.isPrayComplete).toBe(false)
    expect(result.current.isJournalComplete).toBe(false)
    expect(result.current.isMeditateComplete).toBe(false)
  })
})
