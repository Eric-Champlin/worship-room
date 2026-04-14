import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { useVerseSelection } from '../useVerseSelection'

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

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
            path="/bible/:book/:chapter"
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

describe('useVerseSelection', () => {
  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  it('reads ?verse=16 as a single-verse range', () => {
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3?verse=16'),
    })
    expect(result.current.verseRange).toEqual({ start: 16, end: 16 })
  })

  it('reads ?verse=16-18 as a multi-verse range', () => {
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3?verse=16-18'),
    })
    expect(result.current.verseRange).toEqual({ start: 16, end: 18 })
  })

  it('returns null when no verse param is present', () => {
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3'),
    })
    expect(result.current.verseRange).toBeNull()
  })

  it('returns null for an invalid verse value', () => {
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3?verse=abc'),
    })
    expect(result.current.verseRange).toBeNull()
  })

  it('returns null for a reversed range', () => {
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3?verse=5-3'),
    })
    expect(result.current.verseRange).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  it('setVerse(16) writes ?verse=16 to the URL', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setVerse(16)
    })
    expect(latestLocation).toBe('/bible/john/3?verse=16')
  })

  it('setVerse(16, 18) writes ?verse=16-18 to the URL', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setVerse(16, 18)
    })
    expect(latestLocation).toBe('/bible/john/3?verse=16-18')
  })

  it('setVerse with same start and end writes a single value', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setVerse(16, 16)
    })
    expect(latestLocation).toBe('/bible/john/3?verse=16')
  })

  // ---------------------------------------------------------------------------
  // Clear
  // ---------------------------------------------------------------------------

  it('clearVerse removes the verse param', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3?verse=16', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.clearVerse()
    })
    expect(latestLocation).toBe('/bible/john/3')
  })

  it('clearVerse also removes the action param (BB-38 coupling rule)', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3?verse=16&action=explain', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.clearVerse()
    })
    expect(latestLocation).toBe('/bible/john/3')
  })

  it('clearVerse preserves unrelated query params', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3?verse=16&other=keep', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.clearVerse()
    })
    expect(latestLocation).toBe('/bible/john/3?other=keep')
  })

  // ---------------------------------------------------------------------------
  // Stability
  // ---------------------------------------------------------------------------

  it('setter identities are stable across renders when URL is unchanged', () => {
    const { result, rerender } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3?verse=16'),
    })
    const firstSetVerse = result.current.setVerse
    const firstClearVerse = result.current.clearVerse
    rerender()
    expect(result.current.setVerse).toBe(firstSetVerse)
    expect(result.current.clearVerse).toBe(firstClearVerse)
  })

  it('setVerse writes even when the URL already matches (no-op push is safe)', () => {
    // When cold-loaded ?verse=16 and user taps verse 16, the setter is called
    // but URL value is unchanged. Verify no throw.
    const { result } = renderHook(() => useVerseSelection(), {
      wrapper: makeWrapper('/bible/john/3?verse=16'),
    })
    expect(() => {
      act(() => {
        result.current.setVerse(16)
      })
    }).not.toThrow()
  })
})

describe('useVerseSelection — unused vi import guard', () => {
  // Keeps vi import reachable for potential future timer-based tests.
  it('vi is available', () => {
    expect(vi).toBeDefined()
  })
})
