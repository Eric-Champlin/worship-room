import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLongPress } from '../useLongPress'

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires callback after threshold', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback))

    act(() => {
      result.current.onTouchStart({ touches: [{ clientX: 0, clientY: 0 }] } as unknown as React.TouchEvent)
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does not fire on quick tap', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback))

    act(() => {
      result.current.onTouchStart({ touches: [{ clientX: 0, clientY: 0 }] } as unknown as React.TouchEvent)
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    act(() => {
      result.current.onTouchEnd()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('does not fire on touchcancel', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback))

    act(() => {
      result.current.onTouchStart({ touches: [{ clientX: 0, clientY: 0 }] } as unknown as React.TouchEvent)
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    act(() => {
      result.current.onTouchCancel()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('uses custom threshold', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback, { threshold: 300 }))

    act(() => {
      result.current.onTouchStart({ touches: [{ clientX: 0, clientY: 0 }] } as unknown as React.TouchEvent)
    })

    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('exposes didFire ref that is true after long-press', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback))

    expect(result.current.didFire.current).toBe(false)

    act(() => {
      result.current.onTouchStart({ touches: [{ clientX: 0, clientY: 0 }] } as unknown as React.TouchEvent)
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.didFire.current).toBe(true)
  })

  it('resets didFire on new touchstart', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback))

    // Fire long-press
    act(() => {
      result.current.onTouchStart({ touches: [{ clientX: 0, clientY: 0 }] } as unknown as React.TouchEvent)
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current.didFire.current).toBe(true)

    // New touch resets
    act(() => {
      result.current.onTouchStart({ touches: [{ clientX: 0, clientY: 0 }] } as unknown as React.TouchEvent)
    })
    expect(result.current.didFire.current).toBe(false)
  })
})
