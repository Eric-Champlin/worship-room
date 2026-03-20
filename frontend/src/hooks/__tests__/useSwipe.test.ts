import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useSwipe } from '@/hooks/useSwipe'

function createTouchEvent(clientX: number) {
  return { clientX } as unknown as Touch
}

describe('useSwipe', () => {
  it('calls onSwipeLeft on left swipe', () => {
    const onSwipeLeft = vi.fn()
    const { result } = renderHook(() => useSwipe({ onSwipeLeft }))

    act(() => {
      result.current.onTouchStart({
        touches: [createTouchEvent(200)],
      } as unknown as React.TouchEvent)
    })

    act(() => {
      result.current.onTouchEnd({
        changedTouches: [createTouchEvent(100)],
      } as unknown as React.TouchEvent)
    })

    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
  })

  it('calls onSwipeRight on right swipe', () => {
    const onSwipeRight = vi.fn()
    const { result } = renderHook(() => useSwipe({ onSwipeRight }))

    act(() => {
      result.current.onTouchStart({
        touches: [createTouchEvent(100)],
      } as unknown as React.TouchEvent)
    })

    act(() => {
      result.current.onTouchEnd({
        changedTouches: [createTouchEvent(200)],
      } as unknown as React.TouchEvent)
    })

    expect(onSwipeRight).toHaveBeenCalledTimes(1)
  })

  it('ignores swipes below threshold', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()
    const { result } = renderHook(() =>
      useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 }),
    )

    act(() => {
      result.current.onTouchStart({
        touches: [createTouchEvent(200)],
      } as unknown as React.TouchEvent)
    })

    act(() => {
      result.current.onTouchEnd({
        changedTouches: [createTouchEvent(180)],
      } as unknown as React.TouchEvent)
    })

    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('handles missing callbacks gracefully', () => {
    const { result } = renderHook(() => useSwipe({}))

    act(() => {
      result.current.onTouchStart({
        touches: [createTouchEvent(200)],
      } as unknown as React.TouchEvent)
    })

    // Should not throw
    act(() => {
      result.current.onTouchEnd({
        changedTouches: [createTouchEvent(100)],
      } as unknown as React.TouchEvent)
    })
  })
})
