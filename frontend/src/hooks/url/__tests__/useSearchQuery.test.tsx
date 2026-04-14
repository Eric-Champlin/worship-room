import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useSearchQuery } from '../useSearchQuery'

function makeWrapper(initialEntry: string, onLocationChange?: (pathAndSearch: string) => void) {
  function LocationSpy() {
    const loc = useLocation()
    useEffect(() => {
      onLocationChange?.(`${loc.pathname}${loc.search}`)
    }, [loc.pathname, loc.search])
    return null
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/bible"
            element={
              <>
                <LocationSpy />
                {children}
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    )
  }
}

describe('useSearchQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hydrates local state from URL ?q= on mount', () => {
    const { result } = renderHook(() => useSearchQuery(), {
      wrapper: makeWrapper('/bible?q=love'),
    })
    expect(result.current.query).toBe('love')
  })

  it('hydrates to empty string when URL has no q param', () => {
    const { result } = renderHook(() => useSearchQuery(), {
      wrapper: makeWrapper('/bible'),
    })
    expect(result.current.query).toBe('')
  })

  it('setQuery updates local state synchronously', () => {
    const { result } = renderHook(() => useSearchQuery(), {
      wrapper: makeWrapper('/bible'),
    })
    act(() => {
      result.current.setQuery('test')
    })
    expect(result.current.query).toBe('test')
  })

  it('URL write is debounced (default 250ms)', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useSearchQuery(), {
      wrapper: makeWrapper('/bible', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setQuery('a')
    })
    act(() => {
      result.current.setQuery('ab')
    })
    // URL should not have updated yet
    expect(latestLocation).toBe('/bible')

    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(latestLocation).toBe('/bible?q=ab')
  })

  it('empty string clears the URL param after debounce', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useSearchQuery(), {
      wrapper: makeWrapper('/bible?q=love', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setQuery('')
    })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(latestLocation).toBe('/bible')
  })

  it('custom debounceMs is respected', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useSearchQuery({ debounceMs: 500 }), {
      wrapper: makeWrapper('/bible', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setQuery('slow')
    })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(latestLocation).toBe('/bible') // not yet
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(latestLocation).toBe('/bible?q=slow')
  })

  it('unmount cancels pending debounce', () => {
    let latestLocation = ''
    const { result, unmount } = renderHook(() => useSearchQuery(), {
      wrapper: makeWrapper('/bible', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setQuery('pending')
    })
    unmount()
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(latestLocation).toBe('/bible') // no write
  })

  it('external URL change updates local state', () => {
    // Use a wrapper that exposes a navigate function we can call from outside
    let externalNavigate: ((to: string) => void) | null = null
    function NavigateExposer() {
      const navigate = useNavigate()
      const navRef = useRef(navigate)
      navRef.current = navigate
      useEffect(() => {
        externalNavigate = (to: string) => navRef.current(to)
      }, [])
      return null
    }
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <MemoryRouter initialEntries={['/bible?q=love']}>
          <Routes>
            <Route
              path="/bible"
              element={
                <>
                  <NavigateExposer />
                  {children}
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      )
    }

    const { result } = renderHook(() => useSearchQuery(), { wrapper: Wrapper })
    expect(result.current.query).toBe('love')

    act(() => {
      externalNavigate?.('/bible?q=peace')
    })
    expect(result.current.query).toBe('peace')
  })
})
