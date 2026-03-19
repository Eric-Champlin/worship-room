import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react'
import { TooltipCallout } from '../TooltipCallout'

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

import { useReducedMotion } from '@/hooks/useReducedMotion'

// Mock markTooltipSeen
vi.mock('@/services/tooltip-storage', () => ({
  markTooltipSeen: vi.fn(),
}))

import { markTooltipSeen } from '@/services/tooltip-storage'

// Mock useAnnounce
const mockAnnounce = vi.fn()
vi.mock('@/hooks/useAnnounce', () => ({
  useAnnounce: () => ({
    announce: mockAnnounce,
    AnnouncerRegion: () => null,
  }),
}))

// --- Mock IntersectionObserver ---
class IntersectionObserverMock {
  callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver

const AUTO_DISMISS_MS = 8000

const mockElements: HTMLElement[] = []

function createMockRef(rect?: Partial<DOMRect>) {
  const el = document.createElement('div')

  const defaultRect: DOMRect = {
    top: 100,
    bottom: 150,
    left: 200,
    right: 400,
    width: 200,
    height: 50,
    x: 200,
    y: 100,
    toJSON: () => ({}),
    ...rect,
  }

  el.getBoundingClientRect = () => defaultRect
  el.focus = vi.fn()
  document.body.appendChild(el)
  mockElements.push(el)

  return { current: el }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  // Remove only mock elements we created, not portal nodes
  mockElements.forEach((el) => {
    if (el.parentNode) el.parentNode.removeChild(el)
  })
  mockElements.length = 0
})

describe('TooltipCallout', () => {
  it('renders tooltip message and Got it button', () => {
    const ref = createMockRef()
    render(
      <TooltipCallout
        targetRef={ref}
        message="Test tooltip message"
        tooltipId="test-tooltip"
      />,
    )

    expect(screen.getByText('Test tooltip message')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument()
  })

  it('does not render when targetRef is null', () => {
    const ref = { current: null }
    render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="test-tooltip"
      />,
    )

    expect(screen.queryByText('Test message')).not.toBeInTheDocument()
  })

  it('calls onDismiss when Got it is clicked', () => {
    const ref = createMockRef()
    const onDismiss = vi.fn()

    vi.mocked(useReducedMotion).mockReturnValue(true)

    render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="test-tooltip"
        onDismiss={onDismiss}
      />,
    )

    act(() => {
      screen.getByRole('button', { name: 'Got it' }).click()
    })

    expect(markTooltipSeen).toHaveBeenCalledWith('test-tooltip')
    expect(onDismiss).toHaveBeenCalled()
  })

  it('dismisses on Escape key', () => {
    const ref = createMockRef()
    const onDismiss = vi.fn()

    vi.mocked(useReducedMotion).mockReturnValue(true)

    render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="test-tooltip"
        onDismiss={onDismiss}
      />,
    )

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })

    expect(markTooltipSeen).toHaveBeenCalledWith('test-tooltip')
    expect(onDismiss).toHaveBeenCalled()
  })

  it('auto-dismisses after 8 seconds', () => {
    const ref = createMockRef()
    const onDismiss = vi.fn()

    vi.mocked(useReducedMotion).mockReturnValue(true)

    render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="test-tooltip"
        onDismiss={onDismiss}
      />,
    )

    // Make tooltip visible
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Advance past auto-dismiss
    act(() => {
      vi.advanceTimersByTime(AUTO_DISMISS_MS)
    })

    expect(markTooltipSeen).toHaveBeenCalledWith('test-tooltip')
    expect(onDismiss).toHaveBeenCalled()
  })

  it('has role="tooltip" and correct id', () => {
    const ref = createMockRef()
    render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="my-tooltip-id"
      />,
    )

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveAttribute('id', 'my-tooltip-id')
  })

  it('Got it button receives focus on mount', () => {
    // Override requestAnimationFrame to fire immediately so isVisible triggers
    const originalRAF = window.requestAnimationFrame
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    }

    const ref = createMockRef()

    vi.mocked(useReducedMotion).mockReturnValue(true)

    render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="test-tooltip"
      />,
    )

    // Advance setTimeout(0) for focus delay
    act(() => {
      vi.runAllTimers()
    })

    const button = screen.getByRole('button', { name: 'Got it' })
    expect(document.activeElement).toBe(button)

    window.requestAnimationFrame = originalRAF
  })

  it('does not animate when prefers-reduced-motion', () => {
    const ref = createMockRef()

    vi.mocked(useReducedMotion).mockReturnValue(true)

    render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="test-tooltip"
      />,
    )

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.style.transition).toBe('none')
    expect(tooltip.style.transform).toBe('none')
  })

  it('positions below target on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })

    const ref = createMockRef()
    render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="test-tooltip"
        position="top"
      />,
    )

    const tooltip = screen.getByRole('tooltip')
    // On mobile, should have right: 16 set for full-width
    expect(tooltip.style.right).toBe('16px')
  })

  it('cleans up event listeners on unmount', () => {
    const ref = createMockRef()
    const removeEventSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="test-tooltip"
      />,
    )

    unmount()

    const removedEvents = removeEventSpy.mock.calls.map(([event]) => event)
    expect(removedEvents).toContain('scroll')
    expect(removedEvents).toContain('resize')
  })

  it('announces tooltip message via aria-live polite', () => {
    const originalRAF = window.requestAnimationFrame
    window.requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); return 0 }

    const ref = createMockRef()

    vi.mocked(useReducedMotion).mockReturnValue(true)

    render(
      <TooltipCallout
        targetRef={ref}
        message="Helpful tooltip"
        tooltipId="test-tooltip"
      />,
    )

    act(() => { vi.runAllTimers() })

    expect(mockAnnounce).toHaveBeenCalledWith('Helpful tooltip', 'polite')

    window.requestAnimationFrame = originalRAF
  })

  it('Got it button has visible focus ring classes', () => {
    const ref = createMockRef()

    render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="test-tooltip"
      />,
    )

    const button = screen.getByRole('button', { name: 'Got it' })
    expect(button.className).toContain('focus-visible:ring-2')
    expect(button.className).toContain('focus-visible:ring-white')
  })

  it('returns focus to target on Escape dismiss', () => {
    const ref = createMockRef()

    vi.mocked(useReducedMotion).mockReturnValue(true)

    render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="test-tooltip"
        onDismiss={() => {}}
      />,
    )

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })

    expect(ref.current.focus).toHaveBeenCalled()
  })

  it('does not steal focus on auto-dismiss', () => {
    const originalRAF = window.requestAnimationFrame
    window.requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); return 0 }

    const ref = createMockRef()

    vi.mocked(useReducedMotion).mockReturnValue(true)

    render(
      <TooltipCallout
        targetRef={ref}
        message="Test message"
        tooltipId="test-tooltip"
        onDismiss={() => {}}
      />,
    )

    // Make visible
    act(() => { vi.advanceTimersByTime(100) })

    // Clear focus mock calls from initial render
    vi.mocked(ref.current.focus).mockClear()

    // Auto-dismiss after 8s
    act(() => { vi.advanceTimersByTime(AUTO_DISMISS_MS) })

    // Should NOT have called focus on target (auto-dismiss passes false for returnFocusToTarget)
    expect(ref.current.focus).not.toHaveBeenCalled()

    window.requestAnimationFrame = originalRAF
  })
})
