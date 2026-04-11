import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { useActionSheetState } from '../useActionSheetState'
import { DEEP_LINKABLE_ACTIONS } from '@/lib/url/validateAction'

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

describe('useActionSheetState', () => {
  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  it('reads ?action=explain', () => {
    const { result } = renderHook(() => useActionSheetState(), {
      wrapper: makeWrapper('/bible/john/3?verse=16&action=explain'),
    })
    expect(result.current.action).toBe('explain')
  })

  it.each(DEEP_LINKABLE_ACTIONS)('reads each deep-linkable action: %s', (action) => {
    const { result } = renderHook(() => useActionSheetState(), {
      wrapper: makeWrapper(`/bible/john/3?verse=16&action=${action}`),
    })
    expect(result.current.action).toBe(action)
  })

  it('returns null for bookmark (excluded — no sub-view)', () => {
    const { result } = renderHook(() => useActionSheetState(), {
      wrapper: makeWrapper('/bible/john/3?verse=16&action=bookmark'),
    })
    expect(result.current.action).toBeNull()
  })

  it('returns null for pray/journal/meditate (navigate-away)', () => {
    for (const action of ['pray', 'journal', 'meditate']) {
      const { result } = renderHook(() => useActionSheetState(), {
        wrapper: makeWrapper(`/bible/john/3?verse=16&action=${action}`),
      })
      expect(result.current.action).toBeNull()
    }
  })

  it('returns null for an unknown action', () => {
    const { result } = renderHook(() => useActionSheetState(), {
      wrapper: makeWrapper('/bible/john/3?verse=16&action=notreal'),
    })
    expect(result.current.action).toBeNull()
  })

  it('returns null when no action param is present', () => {
    const { result } = renderHook(() => useActionSheetState(), {
      wrapper: makeWrapper('/bible/john/3?verse=16'),
    })
    expect(result.current.action).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  it('setAction writes ?action=reflect to the URL', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useActionSheetState(), {
      wrapper: makeWrapper('/bible/john/3?verse=16', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setAction('reflect')
    })
    expect(latestLocation).toBe('/bible/john/3?verse=16&action=reflect')
  })

  it('setAction preserves the verse param', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useActionSheetState(), {
      wrapper: makeWrapper('/bible/john/3?verse=16-18', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setAction('explain')
    })
    expect(latestLocation).toBe('/bible/john/3?verse=16-18&action=explain')
  })

  // ---------------------------------------------------------------------------
  // Clear
  // ---------------------------------------------------------------------------

  it('clearAction removes only the action param, keeping verse intact', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useActionSheetState(), {
      wrapper: makeWrapper('/bible/john/3?verse=16&action=explain', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.clearAction()
    })
    expect(latestLocation).toBe('/bible/john/3?verse=16')
  })

  it('clearAction preserves unrelated query params', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useActionSheetState(), {
      wrapper: makeWrapper('/bible/john/3?verse=16&action=explain&other=keep', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.clearAction()
    })
    expect(latestLocation).toBe('/bible/john/3?verse=16&other=keep')
  })

  // ---------------------------------------------------------------------------
  // Stability
  // ---------------------------------------------------------------------------

  it('setter identities are stable across renders when URL is unchanged', () => {
    const { result, rerender } = renderHook(() => useActionSheetState(), {
      wrapper: makeWrapper('/bible/john/3?verse=16'),
    })
    const firstSetAction = result.current.setAction
    const firstClearAction = result.current.clearAction
    rerender()
    expect(result.current.setAction).toBe(firstSetAction)
    expect(result.current.clearAction).toBe(firstClearAction)
  })
})
