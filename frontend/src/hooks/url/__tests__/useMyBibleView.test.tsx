import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { useMyBibleView, type MyBibleViewId } from '../useMyBibleView'

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
            path="/my-bible"
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

describe('useMyBibleView', () => {
  it.each<MyBibleViewId>(['all', 'highlights', 'notes', 'bookmarks', 'daily-hub'])(
    'reads ?view=%s',
    (view) => {
      const { result } = renderHook(() => useMyBibleView(), {
        wrapper: makeWrapper(`/my-bible?view=${view}`),
      })
      expect(result.current.view).toBe(view)
    },
  )

  it('defaults to all when view param is missing', () => {
    const { result } = renderHook(() => useMyBibleView(), {
      wrapper: makeWrapper('/my-bible'),
    })
    expect(result.current.view).toBe('all')
  })

  it('defaults to all for an invalid view value', () => {
    const { result } = renderHook(() => useMyBibleView(), {
      wrapper: makeWrapper('/my-bible?view=notreal'),
    })
    expect(result.current.view).toBe('all')
  })

  it('setView writes ?view= to the URL', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useMyBibleView(), {
      wrapper: makeWrapper('/my-bible', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setView('highlights')
    })
    expect(latestLocation).toBe('/my-bible?view=highlights')
  })

  it('setView(all) deletes the param (clean default URL)', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useMyBibleView(), {
      wrapper: makeWrapper('/my-bible?view=highlights', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setView('all')
    })
    expect(latestLocation).toBe('/my-bible')
  })

  it('setView preserves unrelated query params', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useMyBibleView(), {
      wrapper: makeWrapper('/my-bible?other=keep', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setView('bookmarks')
    })
    // URLSearchParams preserves insertion order; 'other' was already present, 'view' is added
    expect(latestLocation).toBe('/my-bible?other=keep&view=bookmarks')
  })
})
