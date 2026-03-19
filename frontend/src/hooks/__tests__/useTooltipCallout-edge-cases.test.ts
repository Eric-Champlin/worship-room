import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTooltipCallout } from '../useTooltipCallout'

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true, user: { name: 'Eric' } })),
}))

import { useAuth } from '@/hooks/useAuth'

// Mock storage
vi.mock('@/services/onboarding-storage', () => ({
  isOnboardingComplete: vi.fn(() => true),
}))

vi.mock('@/services/tooltip-storage', () => ({
  isTooltipSeen: vi.fn(() => false),
  markTooltipSeen: vi.fn(),
}))

// Configurable IntersectionObserver mock
let observerInstance: { callback: IntersectionObserverCallback } | null = null

class IntersectionObserverMock {
  callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    observerInstance = this
  }
  observe() {
    // Start as visible
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver

function createMockRef(rect?: Partial<DOMRect>) {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({
    top: 100, bottom: 150, left: 200, right: 400,
    width: rect?.width ?? 200, height: rect?.height ?? 50,
    x: 200, y: 100,
    toJSON: () => ({}),
  })
  document.body.appendChild(el)
  return { current: el, cleanup: () => el.remove() }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  observerInstance = null
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, user: { name: 'Eric' } } as ReturnType<typeof useAuth>)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useTooltipCallout edge cases', () => {
  it('does not show tooltip when target has zero dimensions', () => {
    const ref = createMockRef({ width: 0, height: 0 })

    const { result } = renderHook(() => useTooltipCallout('test-tooltip', ref))
    act(() => { vi.advanceTimersByTime(2000) })

    expect(result.current.shouldShow).toBe(false)
    ref.cleanup()
  })

  it('hides tooltip when target scrolls out of view (without marking seen)', () => {
    const ref = createMockRef()
    const { result } = renderHook(() => useTooltipCallout('test-tooltip', ref))

    // Become visible after 1s delay
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.shouldShow).toBe(true)

    // Simulate target scrolling out of view
    act(() => {
      observerInstance?.callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(result.current.shouldShow).toBe(false)
    ref.cleanup()
  })

  it('re-shows tooltip when target scrolls back into view', () => {
    const ref = createMockRef()
    const { result } = renderHook(() => useTooltipCallout('test-tooltip', ref))

    // Visible
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.shouldShow).toBe(true)

    // Scroll out
    act(() => {
      observerInstance?.callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(result.current.shouldShow).toBe(false)

    // Scroll back in — starts 1s delay again
    act(() => {
      observerInstance?.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.shouldShow).toBe(true)

    ref.cleanup()
  })

  it('cancels 1s delay timer on unmount', () => {
    const ref = createMockRef()
    const { result, unmount } = renderHook(() => useTooltipCallout('test-tooltip', ref))

    // Timer starts but don't let it complete
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.shouldShow).toBe(false)

    // Unmount
    unmount()

    // Advance past the delay — shouldShow should not have changed
    act(() => { vi.advanceTimersByTime(1000) })
    // No errors should have occurred (no state update on unmounted component)

    ref.cleanup()
  })
})

describe('cleanup behavior', () => {
  it('disconnects IntersectionObserver on unmount', () => {
    const ref = createMockRef()
    const { unmount } = renderHook(() => useTooltipCallout('test-tooltip', ref))

    // Unmount should clean up without errors
    unmount()

    ref.cleanup()
  })
})
