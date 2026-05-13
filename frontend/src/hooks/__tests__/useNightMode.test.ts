import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNightMode, NIGHT_MODE_HINT_KEY } from '../useNightMode'
import { SETTINGS_KEY } from '@/services/settings-storage'

function setSettingsNightMode(value: 'auto' | 'on' | 'off') {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ prayerWall: { nightMode: value } }),
  )
}

function mockBrowserHour(hour: number) {
  vi.setSystemTime(new Date(2026, 4, 13, hour, 0, 0))
}

describe('useNightMode', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('returns active=true, source=auto when hour=23 + preference=auto', () => {
    setSettingsNightMode('auto')
    mockBrowserHour(23)
    const { result } = renderHook(() => useNightMode())
    expect(result.current.active).toBe(true)
    expect(result.current.source).toBe('auto')
    expect(result.current.userPreference).toBe('auto')
  })

  it('returns active=true, source=manual when hour=14 + preference=on', () => {
    setSettingsNightMode('on')
    mockBrowserHour(14)
    const { result } = renderHook(() => useNightMode())
    expect(result.current.active).toBe(true)
    expect(result.current.source).toBe('manual')
    expect(result.current.userPreference).toBe('on')
  })

  it('returns active=false, source=manual when hour=23 + preference=off', () => {
    setSettingsNightMode('off')
    mockBrowserHour(23)
    const { result } = renderHook(() => useNightMode())
    expect(result.current.active).toBe(false)
    expect(result.current.source).toBe('manual')
    expect(result.current.userPreference).toBe('off')
  })

  it('returns active=false, source=auto when hour=14 + preference=auto', () => {
    setSettingsNightMode('auto')
    mockBrowserHour(14)
    const { result } = renderHook(() => useNightMode())
    expect(result.current.active).toBe(false)
    expect(result.current.source).toBe('auto')
  })

  it('polling tick re-evaluates active when the hour crosses 21:00', () => {
    setSettingsNightMode('auto')
    mockBrowserHour(20)
    const { result } = renderHook(() => useNightMode())
    expect(result.current.active).toBe(false)

    // Advance the system clock past the boundary
    mockBrowserHour(21)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current.active).toBe(true)
  })

  it('clearInterval is called on unmount', () => {
    setSettingsNightMode('auto')
    mockBrowserHour(20)
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useNightMode())
    unmount()
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })

  it("writes wr_night_mode_hint='on' on mount when active=true", () => {
    setSettingsNightMode('on')
    mockBrowserHour(14)
    renderHook(() => useNightMode())
    expect(localStorage.getItem(NIGHT_MODE_HINT_KEY)).toBe('on')
  })

  it("writes wr_night_mode_hint='off' on mount when active=false", () => {
    setSettingsNightMode('off')
    mockBrowserHour(23)
    renderHook(() => useNightMode())
    expect(localStorage.getItem(NIGHT_MODE_HINT_KEY)).toBe('off')
  })

  it('gracefully handles localStorage setItem exception (private mode)', () => {
    setSettingsNightMode('on')
    mockBrowserHour(14)
    const realSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = vi.fn((key: string) => {
      if (key === NIGHT_MODE_HINT_KEY) throw new Error('quota')
      return realSetItem.apply(localStorage, arguments as never)
    })
    expect(() => renderHook(() => useNightMode())).not.toThrow()
    Storage.prototype.setItem = realSetItem
  })
})
