import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCompletionTracking } from '../useCompletionTracking'
import { DAILY_COMPLETION_KEY } from '@/constants/daily-experience'

beforeEach(() => {
  localStorage.clear()
})

describe('useCompletionTracking', () => {
  it('returns default completion state with nothing completed', () => {
    const { result } = renderHook(() => useCompletionTracking())
    expect(result.current.isPrayComplete).toBe(false)
    expect(result.current.isJournalComplete).toBe(false)
    expect(result.current.isMeditateComplete).toBe(false)
    expect(result.current.completedMeditationTypes).toEqual([])
  })

  it('markPrayComplete sets pray to true', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markPrayComplete())
    expect(result.current.isPrayComplete).toBe(true)
  })

  it('markJournalComplete sets journal to true', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markJournalComplete())
    expect(result.current.isJournalComplete).toBe(true)
  })

  it('markMeditationComplete sets meditate.completed and adds type', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markMeditationComplete('breathing'))
    expect(result.current.isMeditateComplete).toBe(true)
    expect(result.current.completedMeditationTypes).toContain('breathing')
  })

  it('tracks multiple meditation types', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markMeditationComplete('breathing'))
    act(() => result.current.markMeditationComplete('gratitude'))
    expect(result.current.completedMeditationTypes).toEqual(
      expect.arrayContaining(['breathing', 'gratitude']),
    )
  })

  it('does not duplicate meditation types', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markMeditationComplete('breathing'))
    act(() => result.current.markMeditationComplete('breathing'))
    expect(
      result.current.completedMeditationTypes.filter((t) => t === 'breathing'),
    ).toHaveLength(1)
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useCompletionTracking())
    act(() => result.current.markPrayComplete())
    const stored = JSON.parse(
      localStorage.getItem(DAILY_COMPLETION_KEY) ?? '{}',
    )
    expect(stored.pray).toBe(true)
  })

  it('reads from localStorage on mount', () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem(
      DAILY_COMPLETION_KEY,
      JSON.stringify({ date: today, pray: true, journal: false, meditate: { completed: false, types: [] } }),
    )
    const { result } = renderHook(() => useCompletionTracking())
    expect(result.current.isPrayComplete).toBe(true)
  })

  it('resets when date does not match today', () => {
    localStorage.setItem(
      DAILY_COMPLETION_KEY,
      JSON.stringify({ date: '2020-01-01', pray: true, journal: true, meditate: { completed: true, types: ['breathing'] } }),
    )
    const { result } = renderHook(() => useCompletionTracking())
    expect(result.current.isPrayComplete).toBe(false)
    expect(result.current.isJournalComplete).toBe(false)
    expect(result.current.isMeditateComplete).toBe(false)
  })
})
