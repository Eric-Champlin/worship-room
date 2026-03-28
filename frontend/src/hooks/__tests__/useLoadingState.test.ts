import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLoadingState } from '../useLoadingState'

import { useReducedMotion } from '@/hooks/useReducedMotion'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

describe('useLoadingState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns shouldShowSkeleton=false initially', () => {
    const { result } = renderHook(() => useLoadingState(false))
    expect(result.current.shouldShowSkeleton).toBe(false)
  })

  it('does not show skeleton when load completes under 300ms', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useLoadingState(isLoading),
      { initialProps: { isLoading: true } }
    )

    // Advance 200ms (under threshold)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.shouldShowSkeleton).toBe(false)

    // Loading completes before threshold
    rerender({ isLoading: false })
    expect(result.current.shouldShowSkeleton).toBe(false)
  })

  it('shows skeleton after 300ms threshold', () => {
    const { result } = renderHook(
      ({ isLoading }) => useLoadingState(isLoading),
      { initialProps: { isLoading: true } }
    )

    expect(result.current.shouldShowSkeleton).toBe(false)

    // Advance past threshold
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.shouldShowSkeleton).toBe(true)
  })

  it('hides skeleton when loading completes after threshold', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useLoadingState(isLoading),
      { initialProps: { isLoading: true } }
    )

    // Advance past threshold
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current.shouldShowSkeleton).toBe(true)

    // Loading completes
    rerender({ isLoading: false })
    expect(result.current.shouldShowSkeleton).toBe(false)
  })

  it('cleans up timeout on unmount', () => {
    const { unmount } = renderHook(
      ({ isLoading }) => useLoadingState(isLoading),
      { initialProps: { isLoading: true } }
    )

    // Unmount before timeout fires
    unmount()

    // Advancing timers should not throw
    act(() => {
      vi.advanceTimersByTime(500)
    })
  })

  it('handles rapid isLoading toggles', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useLoadingState(isLoading),
      { initialProps: { isLoading: true } }
    )

    // Toggle off quickly
    rerender({ isLoading: false })
    expect(result.current.shouldShowSkeleton).toBe(false)

    // Toggle on again
    rerender({ isLoading: true })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.shouldShowSkeleton).toBe(true)

    // Toggle off
    rerender({ isLoading: false })
    expect(result.current.shouldShowSkeleton).toBe(false)
  })

  it('returns contentRef', () => {
    const { result } = renderHook(() => useLoadingState(false))
    expect(result.current.contentRef).toBeDefined()
    expect(result.current.contentRef.current).toBeNull()
  })

  it('adds fade-in class to contentRef when loading completes', () => {
    const div = document.createElement('div')
    const { result, rerender } = renderHook(
      ({ isLoading }) => useLoadingState(isLoading),
      { initialProps: { isLoading: true } }
    )

    // Attach the div to contentRef
    Object.defineProperty(result.current.contentRef, 'current', {
      value: div,
      writable: true,
    })

    // Advance past threshold
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Loading completes
    rerender({ isLoading: false })
    expect(div.classList.contains('animate-content-fade-in')).toBe(true)
  })

  it('does not add fade-in class when reduced motion is enabled', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)

    const div = document.createElement('div')
    const { result, rerender } = renderHook(
      ({ isLoading }) => useLoadingState(isLoading),
      { initialProps: { isLoading: true } }
    )

    Object.defineProperty(result.current.contentRef, 'current', {
      value: div,
      writable: true,
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    rerender({ isLoading: false })
    expect(div.classList.contains('animate-content-fade-in')).toBe(false)

    // Restore mock
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('replays fade-in animation on subsequent loading cycles', () => {
    const div = document.createElement('div')
    const { result, rerender } = renderHook(
      ({ isLoading }) => useLoadingState(isLoading),
      { initialProps: { isLoading: true } }
    )

    Object.defineProperty(result.current.contentRef, 'current', {
      value: div,
      writable: true,
    })

    // First cycle
    act(() => { vi.advanceTimersByTime(300) })
    rerender({ isLoading: false })
    expect(div.classList.contains('animate-content-fade-in')).toBe(true)

    // Second loading cycle
    rerender({ isLoading: true })
    act(() => { vi.advanceTimersByTime(300) })
    rerender({ isLoading: false })
    // Class should still be present (re-added after remove + reflow)
    expect(div.classList.contains('animate-content-fade-in')).toBe(true)
  })
})
