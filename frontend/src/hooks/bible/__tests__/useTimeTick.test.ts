import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimeTick } from '../useTimeTick'

describe('useTimeTick', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial tick values', () => {
    const { result } = renderHook(() => useTimeTick())
    expect(result.current.now).toBeInstanceOf(Date)
    expect(result.current.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.current.currentMinute).toBe(0)
  })

  it('updates on 60-second interval', () => {
    const { result } = renderHook(() => useTimeTick())
    expect(result.current.currentMinute).toBe(0)

    act(() => {
      vi.advanceTimersByTime(61_000)
    })
    expect(result.current.currentMinute).toBe(1)
  })

  it('pauses when page hidden', () => {
    const { result } = renderHook(() => useTimeTick())

    // Go hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    const minuteBefore = result.current.currentMinute
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    // Should not have ticked while hidden
    expect(result.current.currentMinute).toBe(minuteBefore)

    // Restore
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })
  })

  it('resumes immediately when page visible', () => {
    const { result } = renderHook(() => useTimeTick())

    // Go hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    const minuteBefore = result.current.currentMinute

    // Go visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Should tick immediately on resume (no 60s wait)
    expect(result.current.currentMinute).toBe(minuteBefore + 1)
  })

  it('restarts interval on visibility resume', () => {
    const { result } = renderHook(() => useTimeTick())

    // Go hidden then visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    const minuteAfterResume = result.current.currentMinute

    // Another 60s should fire
    act(() => {
      vi.advanceTimersByTime(61_000)
    })
    expect(result.current.currentMinute).toBe(minuteAfterResume + 1)
  })

  it('cleans up on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = renderHook(() => useTimeTick())
    unmount()

    expect(clearSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

    clearSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
