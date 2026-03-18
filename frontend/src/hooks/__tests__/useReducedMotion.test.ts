import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReducedMotion } from '../useReducedMotion'

let matchMediaListeners: Map<string, (e: MediaQueryListEvent) => void>
let matchMediaMatches: boolean

beforeEach(() => {
  matchMediaMatches = false
  matchMediaListeners = new Map()

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matchMediaMatches,
      media: query,
      addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        matchMediaListeners.set(event, handler)
      }),
      removeEventListener: vi.fn(),
    })),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useReducedMotion', () => {
  it('returns false by default', () => {
    matchMediaMatches = false
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when prefers-reduced-motion is reduce', () => {
    matchMediaMatches = true
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('updates when media query changes', () => {
    matchMediaMatches = false
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)

    act(() => {
      const handler = matchMediaListeners.get('change')
      handler?.({ matches: true } as MediaQueryListEvent)
    })

    expect(result.current).toBe(true)
  })
})
