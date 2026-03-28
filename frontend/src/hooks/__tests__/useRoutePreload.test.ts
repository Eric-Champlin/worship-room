import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRoutePreload } from '../useRoutePreload'

describe('useRoutePreload', () => {
  let originalRIC: typeof window.requestIdleCallback
  let originalCIC: typeof window.cancelIdleCallback

  beforeEach(() => {
    originalRIC = window.requestIdleCallback
    originalCIC = window.cancelIdleCallback
    vi.useFakeTimers()
  })

  afterEach(() => {
    window.requestIdleCallback = originalRIC
    window.cancelIdleCallback = originalCIC
    vi.useRealTimers()
  })

  it('calls import functions via requestIdleCallback', () => {
    const importFn1 = vi.fn().mockResolvedValue({})
    const importFn2 = vi.fn().mockResolvedValue({})
    const mockRIC = vi.fn((cb: IdleRequestCallback) => {
      cb({} as IdleDeadline)
      return 1
    })
    window.requestIdleCallback = mockRIC

    renderHook(() => useRoutePreload([importFn1, importFn2]))

    expect(mockRIC).toHaveBeenCalledOnce()
    expect(importFn1).toHaveBeenCalledOnce()
    expect(importFn2).toHaveBeenCalledOnce()
  })

  it('falls back to setTimeout when requestIdleCallback is unavailable', () => {
    const importFn = vi.fn().mockResolvedValue({})
    // Remove requestIdleCallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).requestIdleCallback = undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).cancelIdleCallback = undefined

    renderHook(() => useRoutePreload([importFn]))

    // Should not have been called yet (waiting for 2s timeout)
    expect(importFn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(2000)
    expect(importFn).toHaveBeenCalledOnce()
  })

  it('swallows rejected imports without unhandled rejection', async () => {
    const importFn = vi.fn().mockRejectedValue(new Error('network error'))
    const mockRIC = vi.fn((cb: IdleRequestCallback) => {
      cb({} as IdleDeadline)
      return 1
    })
    window.requestIdleCallback = mockRIC

    // Should not throw
    renderHook(() => useRoutePreload([importFn]))
    expect(importFn).toHaveBeenCalledOnce()

    // Flush microtask queue to ensure rejection is handled
    await vi.advanceTimersByTimeAsync(0)
  })

  it('cancels on unmount using cancelIdleCallback', () => {
    const importFn = vi.fn().mockResolvedValue({})
    const mockRIC = vi.fn(() => 42)
    const mockCIC = vi.fn()
    window.requestIdleCallback = mockRIC
    window.cancelIdleCallback = mockCIC

    const { unmount } = renderHook(() => useRoutePreload([importFn]))
    unmount()

    expect(mockCIC).toHaveBeenCalledWith(42)
  })

  it('cancels on unmount using clearTimeout when requestIdleCallback unavailable', () => {
    const importFn = vi.fn().mockResolvedValue({})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).requestIdleCallback = undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).cancelIdleCallback = undefined

    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

    const { unmount } = renderHook(() => useRoutePreload([importFn]))
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
