import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWatchMode } from '../useWatchMode'

// Mock the underlying hooks
vi.mock('../useSettings', () => ({
  useSettings: vi.fn(),
}))
vi.mock('../useNightMode', () => ({
  useNightMode: vi.fn(),
}))

import { useSettings } from '../useSettings'
import { useNightMode } from '../useNightMode'

describe('useWatchMode (Spec 6.4)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  function mockSettingsAndNight(preference: string, nightActive: boolean) {
    ;(useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      settings: { prayerWall: { watchEnabled: preference } },
    })
    ;(useNightMode as ReturnType<typeof vi.fn>).mockReturnValue({
      active: nightActive,
      source: 'auto',
      userPreference: 'auto',
    })
  }

  function mockClockHour(hour: number) {
    const fixed = new Date(2026, 4, 13, hour, 0, 0)
    vi.setSystemTime(fixed)
  }

  it("returns active=true when preference='on' and hour is in Watch window", () => {
    mockSettingsAndNight('on', false)
    mockClockHour(23)
    const { result } = renderHook(() => useWatchMode())
    expect(result.current.active).toBe(true)
    expect(result.current.source).toBe('manual')
    expect(result.current.userPreference).toBe('on')
    expect(result.current.degraded).toBe(true)
  })

  it("returns active=false when preference='off' at 23:00 (Gate-G-FAIL-CLOSED-OPT-IN)", () => {
    mockSettingsAndNight('off', true)
    mockClockHour(23)
    const { result } = renderHook(() => useWatchMode())
    expect(result.current.active).toBe(false)
    expect(result.current.userPreference).toBe('off')
  })

  it('returns active=false when useSettings returns null (loading)', () => {
    ;(useSettings as ReturnType<typeof vi.fn>).mockReturnValue(
      null as unknown as ReturnType<typeof useSettings>,
    )
    ;(useNightMode as ReturnType<typeof vi.fn>).mockReturnValue({
      active: true,
      source: 'auto',
      userPreference: 'auto',
    })
    mockClockHour(23)
    const { result } = renderHook(() => useWatchMode())
    expect(result.current.active).toBe(false)
    expect(result.current.userPreference).toBe('off')
  })

  it('returns active=false when settings.prayerWall.watchEnabled is undefined (degraded gracefully)', () => {
    // Plan-time decision: a hook call that throws propagates to React's error
    // boundary, NOT to the calling hook's try/catch. Instead, exercise the same
    // fail-closed code path by returning a degraded settings shape — the
    // `stored === 'off' || 'auto' || 'on'` check fails and userPreference
    // falls through to its 'off' default.
    ;(useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      settings: { prayerWall: { watchEnabled: undefined } },
    })
    ;(useNightMode as ReturnType<typeof vi.fn>).mockReturnValue({
      active: true,
      source: 'auto',
      userPreference: 'auto',
    })
    mockClockHour(23)
    const { result } = renderHook(() => useWatchMode())
    expect(result.current.active).toBe(false)
    expect(result.current.userPreference).toBe('off')
  })

  it('returns degraded=true in v1 regardless of preference/hour/night', () => {
    mockSettingsAndNight('on', true)
    mockClockHour(2)
    const { result } = renderHook(() => useWatchMode())
    expect(result.current.degraded).toBe(true)
  })

  it('updates active state on 60s tick (live transition at 23:00)', () => {
    mockSettingsAndNight('on', false)
    mockClockHour(22) // 22:00 — not yet Watch hour
    const { result } = renderHook(() => useWatchMode())
    expect(result.current.active).toBe(false)

    // Advance to 23:00 and tick the interval
    mockClockHour(23)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.active).toBe(true)
  })
})
