import { renderHook, act } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useScrollReveal, staggerDelay } from '../useScrollReveal'

const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()

let intersectionCallback: IntersectionObserverCallback

beforeEach(() => {
  mockObserve.mockReset()
  mockUnobserve.mockReset()
  mockDisconnect.mockReset()

  // Must use a class (not arrow fn) for `new IntersectionObserver()`
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        intersectionCallback = cb
      }
      observe = mockObserve
      unobserve = mockUnobserve
      disconnect = mockDisconnect
    }
  )

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

function TestComponent({ options = {} }: { options?: Parameters<typeof useScrollReveal>[0] }) {
  const { ref, isVisible } = useScrollReveal(options)
  return <div ref={ref as React.RefObject<HTMLDivElement>} data-testid="target" data-visible={String(isVisible)} />
}

function renderWithElement(options = {}) {
  return render(<TestComponent options={options} />)
}

function getVisible() {
  return screen.getByTestId('target').getAttribute('data-visible') === 'true'
}

describe('useScrollReveal', () => {
  it('returns isVisible false initially', () => {
    renderWithElement()
    expect(getVisible()).toBe(false)
  })

  it('returns isVisible true after intersection', () => {
    renderWithElement()

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })

    expect(getVisible()).toBe(true)
  })

  it('triggerOnce=true keeps isVisible after exit', () => {
    renderWithElement({ triggerOnce: true })

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })
    expect(getVisible()).toBe(true)

    act(() => {
      intersectionCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })
    expect(getVisible()).toBe(true)
  })

  it('triggerOnce=false resets isVisible on exit', () => {
    renderWithElement({ triggerOnce: false })

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })
    expect(getVisible()).toBe(true)

    act(() => {
      intersectionCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })
    expect(getVisible()).toBe(false)
  })

  it('prefers-reduced-motion returns isVisible true immediately', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    )

    renderWithElement()
    expect(getVisible()).toBe(true)
  })

  it('ref is a valid RefObject', () => {
    const { result } = renderHook(() => useScrollReveal())
    expect(result.current.ref).toBeDefined()
    expect(result.current.ref).toHaveProperty('current')
  })
})

describe('staggerDelay', () => {
  it('returns correct transitionDelay with all args', () => {
    expect(staggerDelay(2, 100, 50)).toEqual({ transitionDelay: '250ms' })
  })

  it('returns correct transitionDelay with defaults', () => {
    expect(staggerDelay(3)).toEqual({ transitionDelay: '300ms' })
  })

  it('returns 0ms for index 0', () => {
    expect(staggerDelay(0)).toEqual({ transitionDelay: '0ms' })
  })
})
