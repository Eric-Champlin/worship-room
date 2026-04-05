import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnimatedCounter } from '../useAnimatedCounter'

let matchMediaMatches: boolean

// Manual rAF mock: collect callbacks and step through them
let rafCallbacks: Map<number, FrameRequestCallback>
let rafIdCounter: number
let cancelledIds: Set<number>

function mockRaf() {
  rafIdCounter = 1
  rafCallbacks = new Map()
  cancelledIds = new Set()

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    const id = rafIdCounter++
    rafCallbacks.set(id, cb)
    return id
  })

  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    cancelledIds.add(id)
    rafCallbacks.delete(id)
  })
}

function stepFrame(timestamp: number) {
  const cbs = [...rafCallbacks.entries()]
  rafCallbacks.clear()
  for (const [id, cb] of cbs) {
    if (!cancelledIds.has(id)) {
      cb(timestamp)
    }
  }
}

beforeEach(() => {
  matchMediaMatches = false

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matchMediaMatches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })

  mockRaf()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAnimatedCounter', () => {
  it('returns 0 initially when not enabled', () => {
    const { result } = renderHook(() =>
      useAnimatedCounter({ target: 50, enabled: false })
    )
    expect(result.current).toBe(0)
  })

  it('returns target immediately when reduced motion preferred', () => {
    matchMediaMatches = true
    const { result } = renderHook(() =>
      useAnimatedCounter({ target: 50, enabled: true })
    )
    expect(result.current).toBe(50)
  })

  it('returns target value when enabled after animation completes', () => {
    const { result } = renderHook(() =>
      useAnimatedCounter({ target: 50, duration: 800, enabled: true })
    )

    // Step through animation: first frame sets start time, subsequent frames advance
    act(() => stepFrame(0))
    act(() => stepFrame(900)) // past duration

    expect(result.current).toBe(50)
  })

  it('cleans up rAF on unmount', () => {
    const { unmount } = renderHook(() =>
      useAnimatedCounter({ target: 50, enabled: true })
    )

    // rAF was called at least once
    expect(window.requestAnimationFrame).toHaveBeenCalled()

    unmount()

    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('does not re-animate when enabled toggles off and back on', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useAnimatedCounter({ target: 50, duration: 800, enabled }),
      { initialProps: { enabled: true } }
    )

    // Complete the animation
    act(() => stepFrame(0))
    act(() => stepFrame(900))
    expect(result.current).toBe(50)

    // Disable then re-enable
    rerender({ enabled: false })
    rerender({ enabled: true })

    // Value should still be target — no restart
    expect(result.current).toBe(50)

    // No new rAF callbacks should be pending
    expect(rafCallbacks.size).toBe(0)
  })

  it('respects delay before starting animation', () => {
    const { result } = renderHook(() =>
      useAnimatedCounter({ target: 50, duration: 800, delay: 200, enabled: true })
    )

    // First frame at t=0 — within delay, value should remain 0
    act(() => stepFrame(0))
    expect(result.current).toBe(0)

    // Still within delay at t=100
    act(() => stepFrame(100))
    expect(result.current).toBe(0)

    // Delay elapsed at t=200, animation starts
    act(() => stepFrame(200))
    // First animation frame — animationStart is set, elapsed=0, value=0
    expect(result.current).toBe(0)

    // Well past duration
    act(() => stepFrame(1100))
    expect(result.current).toBe(50)
  })

  it('intermediate values are integers (Math.round)', () => {
    const { result } = renderHook(() =>
      useAnimatedCounter({ target: 50, duration: 800, enabled: true })
    )

    // First frame sets start time
    act(() => stepFrame(0))

    // Mid-animation frame
    act(() => stepFrame(400))

    // Value should be a whole number
    expect(Number.isInteger(result.current)).toBe(true)
    // And should be between 0 and 50 (exclusive of both for mid-animation)
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(50)
  })
})
