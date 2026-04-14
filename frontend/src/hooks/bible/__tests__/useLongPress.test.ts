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

  function makePointerEvent(overrides: Partial<React.PointerEvent> = {}): React.PointerEvent {
    return {
      clientX: 100,
      clientY: 200,
      ...overrides,
    } as React.PointerEvent
  }

  it('fires callback after 400ms', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback))

    act(() => {
      result.current.onPointerDown(makePointerEvent())
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('cancels on pointerUp before timeout', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback))

    act(() => {
      result.current.onPointerDown(makePointerEvent())
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    act(() => {
      result.current.onPointerUp()
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('cancels on pointerMove > 10px', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback))

    act(() => {
      result.current.onPointerDown(makePointerEvent({ clientX: 100, clientY: 200 }))
    })

    act(() => {
      result.current.onPointerMove(makePointerEvent({ clientX: 115, clientY: 200 }))
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).not.toHaveBeenCalled()
  })
})
