import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { useDailyHubTab, type DailyHubTab } from '../useDailyHubTab'

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
            path="/daily"
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

describe('useDailyHubTab', () => {
  it.each<DailyHubTab>(['devotional', 'pray', 'journal', 'meditate'])(
    'reads ?tab=%s',
    (tab) => {
      const { result } = renderHook(() => useDailyHubTab(), {
        wrapper: makeWrapper(`/daily?tab=${tab}`),
      })
      expect(result.current.tab).toBe(tab)
    },
  )

  it('defaults to devotional when tab param is missing', () => {
    const { result } = renderHook(() => useDailyHubTab(), {
      wrapper: makeWrapper('/daily'),
    })
    expect(result.current.tab).toBe('devotional')
  })

  it('defaults to devotional for invalid tab value', () => {
    const { result } = renderHook(() => useDailyHubTab(), {
      wrapper: makeWrapper('/daily?tab=notreal'),
    })
    expect(result.current.tab).toBe('devotional')
  })

  it('setTab writes ?tab= to the URL', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useDailyHubTab(), {
      wrapper: makeWrapper('/daily', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setTab('pray')
    })
    expect(latestLocation).toBe('/daily?tab=pray')
  })

  it('setTab clears other search params (matches existing DailyHub behavior)', () => {
    let latestLocation = ''
    const { result } = renderHook(() => useDailyHubTab(), {
      wrapper: makeWrapper('/daily?tab=devotional&context=foo&prompt=bar', (loc) => {
        latestLocation = loc
      }),
    })
    act(() => {
      result.current.setTab('pray')
    })
    expect(latestLocation).toBe('/daily?tab=pray')
  })
})
