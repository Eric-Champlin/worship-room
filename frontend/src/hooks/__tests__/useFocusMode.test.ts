import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFocusMode } from '../useFocusMode'

// Mock useReducedMotion
let mockReducedMotion = false
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

// Helper to fire window events
function fireScroll() {
  window.dispatchEvent(new Event('scroll'))
}

function fireKeydown(key = 'a') {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}

function fireTouchstart() {
  window.dispatchEvent(new Event('touchstart'))
}

function fireWheel() {
  window.dispatchEvent(new Event('wheel'))
}

function fireMousemove(movementX = 10, movementY = 10) {
  const event = new MouseEvent('mousemove')
  // jsdom doesn't support movementX/Y in MouseEventInit, so assign directly
  Object.defineProperty(event, 'movementX', { value: movementX })
  Object.defineProperty(event, 'movementY', { value: movementY })
  window.dispatchEvent(event)
}

describe('useFocusMode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    // Most tests expect focus mode to be enabled; set it explicitly since
    // the default changed to false (BB-50). Tests verifying disabled behavior
    // override this via localStorage.setItem('wr_bible_focus_enabled', 'false').
    // Mark v2 migration as already run so it doesn't wipe the explicit value —
    // these tests are verifying post-migration behavior. Migration-specific tests
    // (BB-51) clear this flag and manipulate legacy state explicitly.
    localStorage.setItem('wr_bible_focus_enabled', 'true')
    localStorage.setItem('wr_bible_focus_v2_migrated', 'true')
    mockReducedMotion = false
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // --- Default state ---

  it('returns opacity 1 and pointerEvents auto initially', () => {
    const { result } = renderHook(() => useFocusMode())
    expect(result.current.chromeOpacity).toBe(1)
    expect(result.current.chromePointerEvents).toBe('auto')
    expect(result.current.vignetteVisible).toBe(false)
  })

  it('defaults to enabled=false when no localStorage value set', () => {
    localStorage.removeItem('wr_bible_focus_enabled')
    const { result } = renderHook(() => useFocusMode())
    expect(result.current.settings.enabled).toBe(false)
  })

  // --- Timer-based focus transition ---

  it('transitions to focused after configured delay (6000ms default)', () => {
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(result.current.chromeOpacity).toBe(0)
    expect(result.current.vignetteVisible).toBe(true)
  })

  // --- Timer reset on qualifying interactions ---

  it('resets timer on scroll event', () => {
    const { result } = renderHook(() => useFocusMode())

    // Advance almost to the delay
    act(() => {
      vi.advanceTimersByTime(5999)
    })
    expect(result.current.chromeOpacity).toBe(1)

    // Scroll resets timer
    act(() => {
      fireScroll()
    })

    // Advance another full delay — should NOW be focused
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(result.current.chromeOpacity).toBe(0)
  })

  it('resets timer on keydown event', () => {
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      vi.advanceTimersByTime(5999)
    })

    act(() => {
      fireKeydown()
    })

    act(() => {
      vi.advanceTimersByTime(5999)
    })
    expect(result.current.chromeOpacity).toBe(1)
  })

  it('resets timer on touchstart event', () => {
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      vi.advanceTimersByTime(5999)
    })

    act(() => {
      fireTouchstart()
    })

    act(() => {
      vi.advanceTimersByTime(5999)
    })
    expect(result.current.chromeOpacity).toBe(1)
  })

  it('resets timer on wheel event', () => {
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      vi.advanceTimersByTime(5999)
    })

    act(() => {
      fireWheel()
    })

    act(() => {
      vi.advanceTimersByTime(5999)
    })
    expect(result.current.chromeOpacity).toBe(1)
  })

  // --- Custom delay ---

  it('respects custom delay setting (3000ms)', () => {
    localStorage.setItem('wr_bible_focus_delay', '3000')
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.chromeOpacity).toBe(0)
  })

  // --- Mousemove jitter filtering ---

  it('ignores mousemove with cumulative delta < 5px', () => {
    const { result } = renderHook(() => useFocusMode())

    // Enter focused state first
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(result.current.chromeOpacity).toBe(0)

    // Fire tiny mouse movement
    act(() => {
      fireMousemove(1, 1)
      vi.advanceTimersByTime(100) // debounce fires
    })

    // Should still be focused — delta < 5px
    expect(result.current.chromeOpacity).toBe(0)
  })

  it('triggers activity on mousemove with cumulative delta > 5px', () => {
    const { result } = renderHook(() => useFocusMode())

    // Enter focused state
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(result.current.chromeOpacity).toBe(0)

    // Fire large mouse movement
    act(() => {
      fireMousemove(10, 10)
      vi.advanceTimersByTime(100) // debounce fires
    })

    // Should restore chrome
    expect(result.current.chromeOpacity).toBe(1)
  })

  // --- Manual trigger ---

  it('manual trigger enters focused immediately', () => {
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      result.current.triggerFocused()
    })

    expect(result.current.chromeOpacity).toBe(0)
    expect(result.current.vignetteVisible).toBe(true)
  })

  it('manual trigger sets isManuallyArmed', () => {
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      result.current.triggerFocused()
    })

    expect(result.current.isManuallyArmed).toBe(true)
  })

  it('armed state clears on next activity', () => {
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      result.current.triggerFocused()
    })
    expect(result.current.isManuallyArmed).toBe(true)

    act(() => {
      fireScroll()
    })

    expect(result.current.isManuallyArmed).toBe(false)
  })

  // --- Pause/resume ref-counting ---

  it('pause increments ref count — two pauses, one resume = still idle', () => {
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      result.current.pauseFocusMode()
      result.current.pauseFocusMode()
    })

    act(() => {
      result.current.resumeFocusMode()
    })

    // Advance past delay — should NOT focus because still paused
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(result.current.chromeOpacity).toBe(1)
  })

  it('resume at count 0 restores active state', () => {
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      result.current.pauseFocusMode()
    })

    act(() => {
      result.current.resumeFocusMode()
    })

    // Advance past delay — should focus now
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(result.current.chromeOpacity).toBe(0)
  })

  // --- Enabled/disabled ---

  it('enabled=false prevents focus', () => {
    localStorage.setItem('wr_bible_focus_enabled', 'false')
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(result.current.chromeOpacity).toBe(1)
  })

  it('changing enabled=false restores chrome from focused state', () => {
    const { result } = renderHook(() => useFocusMode())

    // Enter focused
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(result.current.chromeOpacity).toBe(0)

    // Disable
    act(() => {
      result.current.updateFocusSetting('enabled', false)
    })

    expect(result.current.chromeOpacity).toBe(1)
    expect(result.current.vignetteVisible).toBe(false)
  })

  // --- Pointer-events sequencing ---

  it('pointer-events none set AFTER fade-out (600ms)', () => {
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    // Immediately after entering focused: opacity=0 but pointer-events still auto
    expect(result.current.chromeOpacity).toBe(0)
    expect(result.current.chromePointerEvents).toBe('auto')

    // After fade-out duration
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(result.current.chromePointerEvents).toBe('none')
  })

  it('pointer-events auto set immediately on restore', () => {
    const { result } = renderHook(() => useFocusMode())

    // Enter focused and wait for pointer-events: none
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(result.current.chromePointerEvents).toBe('none')

    // Restore via scroll
    act(() => {
      fireScroll()
    })

    // pointer-events should be auto immediately
    expect(result.current.chromePointerEvents).toBe('auto')
  })

  // --- Reduced motion ---

  it('respects reduced motion (instant transitions)', () => {
    mockReducedMotion = true
    const { result } = renderHook(() => useFocusMode())

    expect(result.current.chromeTransitionMs).toBe(0)
  })

  // --- Settings persistence ---

  it('settings persist to localStorage', () => {
    const { result } = renderHook(() => useFocusMode())

    act(() => {
      result.current.updateFocusSetting('delay', 3000)
    })

    expect(localStorage.getItem('wr_bible_focus_delay')).toBe('3000')
    expect(result.current.settings.delay).toBe(3000)
  })

  it('reads settings from localStorage on mount', () => {
    localStorage.setItem('wr_bible_focus_enabled', 'false')
    localStorage.setItem('wr_bible_focus_delay', '12000')
    localStorage.setItem('wr_bible_focus_dim_orbs', 'false')

    const { result } = renderHook(() => useFocusMode())

    expect(result.current.settings.enabled).toBe(false)
    expect(result.current.settings.delay).toBe(12000)
    expect(result.current.settings.dimOrbs).toBe(false)
  })

  // --- BB-51 one-time migration (wr_bible_focus_v2_migrated) ---

  describe('BB-51 migration', () => {
    it('resets legacy true value and sets migration flag for pre-migration user', () => {
      // Simulate a legacy user pre-BB-51: focus enabled=true, no migration flag
      localStorage.clear()
      localStorage.setItem('wr_bible_focus_enabled', 'true')

      const { result } = renderHook(() => useFocusMode())

      expect(result.current.settings.enabled).toBe(false)
      expect(localStorage.getItem('wr_bible_focus_enabled')).toBeNull()
      expect(localStorage.getItem('wr_bible_focus_v2_migrated')).toBe('true')
    })

    it('preserves legacy false value but still sets migration flag', () => {
      localStorage.clear()
      localStorage.setItem('wr_bible_focus_enabled', 'false')

      const { result } = renderHook(() => useFocusMode())

      expect(result.current.settings.enabled).toBe(false)
      expect(localStorage.getItem('wr_bible_focus_enabled')).toBe('false')
      expect(localStorage.getItem('wr_bible_focus_v2_migrated')).toBe('true')
    })

    it('does not re-run migration when flag is already set (respects explicit true)', () => {
      localStorage.clear()
      localStorage.setItem('wr_bible_focus_enabled', 'true')
      localStorage.setItem('wr_bible_focus_v2_migrated', 'true')

      const { result } = renderHook(() => useFocusMode())

      expect(result.current.settings.enabled).toBe(true)
      expect(localStorage.getItem('wr_bible_focus_enabled')).toBe('true')
    })

    it('new user (clean storage) defaults to enabled=false and sets migration flag', () => {
      localStorage.clear()

      const { result } = renderHook(() => useFocusMode())

      expect(result.current.settings.enabled).toBe(false)
      expect(localStorage.getItem('wr_bible_focus_v2_migrated')).toBe('true')
    })

    it('user can toggle focus mode on after migration', () => {
      // Start as a pre-migration user with legacy true — migration resets to false
      localStorage.clear()
      localStorage.setItem('wr_bible_focus_enabled', 'true')

      const { result: first } = renderHook(() => useFocusMode())
      expect(first.current.settings.enabled).toBe(false)

      // User toggles focus mode on
      act(() => {
        first.current.updateFocusSetting('enabled', true)
      })

      // New mount reads the explicit preference (migration flag already set)
      const { result: second } = renderHook(() => useFocusMode())
      expect(second.current.settings.enabled).toBe(true)
    })
  })
})
