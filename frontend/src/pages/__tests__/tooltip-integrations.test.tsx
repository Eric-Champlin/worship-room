import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTooltipCallout } from '@/hooks/useTooltipCallout'

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true, user: { name: 'Eric' } })),
}))

import { useAuth } from '@/hooks/useAuth'

// Mock storage
vi.mock('@/services/onboarding-storage', () => ({
  isOnboardingComplete: vi.fn(() => true),
}))

import { isOnboardingComplete } from '@/services/onboarding-storage'

vi.mock('@/services/tooltip-storage', () => ({
  isTooltipSeen: vi.fn(() => false),
  markTooltipSeen: vi.fn(),
}))

import { isTooltipSeen } from '@/services/tooltip-storage'

// Mock IntersectionObserver
class IntersectionObserverMock {
  callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  observe() {
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
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, user: { name: 'Eric' } } as ReturnType<typeof useAuth>)
  vi.mocked(isOnboardingComplete).mockReturnValue(true)
  vi.mocked(isTooltipSeen).mockReturnValue(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Daily Hub tooltip integration', () => {
  it('shows tab bar tooltip on first authenticated visit', () => {
    const ref = createMockRef()
    const { result } = renderHook(() => useTooltipCallout('daily-hub-tabs', ref))

    act(() => { vi.advanceTimersByTime(1000) })

    expect(result.current.shouldShow).toBe(true)
    ref.cleanup()
  })

  it('does not show tooltip when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, user: null } as ReturnType<typeof useAuth>)
    const ref = createMockRef()
    const { result } = renderHook(() => useTooltipCallout('daily-hub-tabs', ref))

    act(() => { vi.advanceTimersByTime(2000) })

    expect(result.current.shouldShow).toBe(false)
    ref.cleanup()
  })

  it('does not show tooltip when already seen', () => {
    vi.mocked(isTooltipSeen).mockReturnValue(true)
    const ref = createMockRef()
    const { result } = renderHook(() => useTooltipCallout('daily-hub-tabs', ref))

    act(() => { vi.advanceTimersByTime(2000) })

    expect(result.current.shouldShow).toBe(false)
    ref.cleanup()
  })
})

describe('Prayer Wall tooltip integration', () => {
  it('shows composer tooltip on first authenticated visit', () => {
    const ref = createMockRef()
    const { result } = renderHook(() => useTooltipCallout('prayer-wall-composer', ref))

    act(() => { vi.advanceTimersByTime(1000) })

    expect(result.current.shouldShow).toBe(true)
    ref.cleanup()
  })

  it('does not show tooltip when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, user: null } as ReturnType<typeof useAuth>)
    const ref = createMockRef()
    const { result } = renderHook(() => useTooltipCallout('prayer-wall-composer', ref))

    act(() => { vi.advanceTimersByTime(2000) })

    expect(result.current.shouldShow).toBe(false)
    ref.cleanup()
  })
})

describe('Music page tooltip integration', () => {
  it('shows ambient tab tooltip on first authenticated visit', () => {
    const ref = createMockRef()
    const { result } = renderHook(() => useTooltipCallout('music-ambient-tab', ref))

    act(() => { vi.advanceTimersByTime(1000) })

    expect(result.current.shouldShow).toBe(true)
    ref.cleanup()
  })

  it('does not show tooltip when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, user: null } as ReturnType<typeof useAuth>)
    const ref = createMockRef()
    const { result } = renderHook(() => useTooltipCallout('music-ambient-tab', ref))

    act(() => { vi.advanceTimersByTime(2000) })

    expect(result.current.shouldShow).toBe(false)
    ref.cleanup()
  })
})

describe('Cross-page tooltip behavior', () => {
  it('tooltips do not stack — unmounting cleans up', () => {
    const ref1 = createMockRef()
    const ref2 = createMockRef()

    const { result: result1, unmount: unmount1 } = renderHook(() =>
      useTooltipCallout('daily-hub-tabs', ref1),
    )

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result1.current.shouldShow).toBe(true)

    // Unmount first (simulating navigation away)
    unmount1()

    // Second tooltip on a new page
    const { result: result2 } = renderHook(() =>
      useTooltipCallout('prayer-wall-composer', ref2),
    )

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result2.current.shouldShow).toBe(true)

    ref1.cleanup()
    ref2.cleanup()
  })
})
