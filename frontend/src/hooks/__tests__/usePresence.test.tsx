import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePresence } from '../usePresence'

const POLL_MS = 30_000
const BACKOFF_MS = 60_000

function mockFetchOk(count: number) {
  return vi.fn(async () =>
    new Response(JSON.stringify({ data: { count }, meta: { requestId: 'r1' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function mockFetch429() {
  return vi.fn(async () =>
    new Response(
      JSON.stringify({ code: 'RATE_LIMITED', message: 'Too many', requestId: 'r1' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } },
    ),
  )
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('usePresence', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setVisibility('visible')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('fetches immediately on mount when not suppressed', async () => {
    const fetchSpy = mockFetchOk(5)
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => usePresence({ suppressed: false }))

    await act(async () => {
      // flush microtasks (the fetch resolves on next tick)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result.current.count).toBe(5)
  })

  it('does NOT fetch when suppressed=true', async () => {
    const fetchSpy = mockFetchOk(5)
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => usePresence({ suppressed: true }))

    await act(async () => {
      vi.advanceTimersByTime(POLL_MS * 3)
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.current.count).toBeNull()
    expect(result.current.paused).toBe(true)
  })

  it('polls every 30s while visible', async () => {
    const fetchSpy = mockFetchOk(7)
    vi.stubGlobal('fetch', fetchSpy)

    renderHook(() => usePresence({ suppressed: false }))

    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(POLL_MS)
      await Promise.resolve(); await Promise.resolve()
    })
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    await act(async () => {
      vi.advanceTimersByTime(POLL_MS)
      await Promise.resolve(); await Promise.resolve()
    })
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('clears count to null when suppressed flips to true', async () => {
    const fetchSpy = mockFetchOk(5)
    vi.stubGlobal('fetch', fetchSpy)

    const { result, rerender } = renderHook(
      ({ suppressed }: { suppressed: boolean }) => usePresence({ suppressed }),
      { initialProps: { suppressed: false } },
    )

    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
    expect(result.current.count).toBe(5)

    await act(async () => {
      rerender({ suppressed: true })
    })
    expect(result.current.count).toBeNull()
  })

  it('backs off for 60s on 429', async () => {
    const fetchSpy = mockFetch429()
    vi.stubGlobal('fetch', fetchSpy)

    renderHook(() => usePresence({ suppressed: false }))

    // Initial fetch fires (returns 429)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // 30s later, no second fetch (interval was cleared by backoff)
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS)
      await Promise.resolve()
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // After 60s total backoff window, polling resumes (one immediate + interval)
    await act(async () => {
      vi.advanceTimersByTime(BACKOFF_MS)
      await Promise.resolve(); await Promise.resolve()
    })
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('pauses when document becomes hidden', async () => {
    const fetchSpy = mockFetchOk(3)
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => usePresence({ suppressed: false }))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    act(() => setVisibility('hidden'))
    expect(result.current.paused).toBe(true)

    // 60s passes, no additional fetches
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS * 2)
      await Promise.resolve()
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('resumes with one immediate fetch on visibility=visible', async () => {
    const fetchSpy = mockFetchOk(3)
    vi.stubGlobal('fetch', fetchSpy)

    renderHook(() => usePresence({ suppressed: false }))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    act(() => setVisibility('hidden'))
    await act(async () => { vi.advanceTimersByTime(POLL_MS); await Promise.resolve() })
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    act(() => setVisibility('visible'))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
