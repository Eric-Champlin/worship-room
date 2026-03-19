import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTooltipCallout } from '../useTooltipCallout'

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true, user: { name: 'Eric' } })),
}))

import { useAuth } from '@/hooks/useAuth'

// Mock onboarding-storage
vi.mock('@/services/onboarding-storage', () => ({
  isOnboardingComplete: vi.fn(() => true),
}))

import { isOnboardingComplete } from '@/services/onboarding-storage'

// Mock tooltip-storage
vi.mock('@/services/tooltip-storage', () => ({
  isTooltipSeen: vi.fn(() => false),
  markTooltipSeen: vi.fn(),
}))

import { isTooltipSeen, markTooltipSeen } from '@/services/tooltip-storage'

// Mock IntersectionObserver
let intersectionCallbacks: IntersectionObserverCallback[] = []

class IntersectionObserverMock {
  callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    intersectionCallbacks.push(callback)
  }
  observe() {
    // Trigger as visible immediately
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver

function createMockRef() {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({
    top: 100, bottom: 150, left: 200, right: 400,
    width: 200, height: 50, x: 200, y: 100,
    toJSON: () => ({}),
  })
  document.body.appendChild(el)
  return { current: el, cleanup: () => el.remove() }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  intersectionCallbacks = []
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, user: { name: 'Eric' } } as ReturnType<typeof useAuth>)
  vi.mocked(isOnboardingComplete).mockReturnValue(true)
  vi.mocked(isTooltipSeen).mockReturnValue(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useTooltipCallout', () => {
  it('returns shouldShow=false when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, user: null } as ReturnType<typeof useAuth>)
    const ref = createMockRef()

    const { result } = renderHook(() => useTooltipCallout('test-tooltip', ref))
    act(() => { vi.advanceTimersByTime(2000) })

    expect(result.current.shouldShow).toBe(false)
    ref.cleanup()
  })

  it('returns shouldShow=false when onboarding not complete', () => {
    vi.mocked(isOnboardingComplete).mockReturnValue(false)
    const ref = createMockRef()

    const { result } = renderHook(() => useTooltipCallout('test-tooltip', ref))
    act(() => { vi.advanceTimersByTime(2000) })

    expect(result.current.shouldShow).toBe(false)
    ref.cleanup()
  })

  it('returns shouldShow=false when tooltip already seen', () => {
    vi.mocked(isTooltipSeen).mockReturnValue(true)
    const ref = createMockRef()

    const { result } = renderHook(() => useTooltipCallout('test-tooltip', ref))
    act(() => { vi.advanceTimersByTime(2000) })

    expect(result.current.shouldShow).toBe(false)
    ref.cleanup()
  })

  it('returns shouldShow=true after 1s delay when all conditions met', () => {
    const ref = createMockRef()

    const { result } = renderHook(() => useTooltipCallout('test-tooltip', ref))

    // Before delay
    expect(result.current.shouldShow).toBe(false)

    // After 1s delay
    act(() => { vi.advanceTimersByTime(1000) })

    expect(result.current.shouldShow).toBe(true)
    ref.cleanup()
  })

  it('dismiss marks tooltip as seen and sets shouldShow to false', () => {
    const ref = createMockRef()

    const { result } = renderHook(() => useTooltipCallout('test-tooltip', ref))

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.shouldShow).toBe(true)

    act(() => { result.current.dismiss() })

    expect(markTooltipSeen).toHaveBeenCalledWith('test-tooltip')
    expect(result.current.shouldShow).toBe(false)
    ref.cleanup()
  })
})
