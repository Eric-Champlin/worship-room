import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSleepTimer } from '../useSleepTimer'

// ── Mocks ────────────────────────────────────────────────────────────

const mockDispatch = vi.fn()
const mockShowToast = vi.fn()
const mockEngine = {
  scheduleSleepFade: vi.fn(),
  freezeFades: vi.fn().mockReturnValue({ foregroundGain: 0.5, ambientGains: new Map() }),
  resumeSleepFade: vi.fn(),
  breatheUpAmbient: vi.fn(),
  pauseAll: vi.fn(),
  resumeAll: vi.fn(),
}

let mockState: Record<string, unknown> = {}

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockState,
  useAudioDispatch: () => mockDispatch,
  useAudioEngine: () => mockEngine,
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

function makeTimer(overrides: Record<string, unknown> = {}) {
  return {
    isActive: true,
    isPaused: false,
    totalDurationMs: 60 * 60 * 1000, // 60 min
    fadeDurationMs: 10 * 60 * 1000,  // 10 min
    startTime: Date.now(),
    pausedElapsedMs: 0,
    phase: 'full-volume',
    ...overrides,
  }
}

describe('useSleepTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockState = {
      sleepTimer: null,
      foregroundContent: null,
      activeSounds: [],
      isPlaying: false,
    }
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns inactive state when no timer', () => {
    const { result } = renderHook(() => useSleepTimer())
    expect(result.current.isActive).toBe(false)
    expect(result.current.phase).toBeNull()
    expect(result.current.remainingMs).toBe(0)
  })

  describe('start', () => {
    it('dispatches START_SLEEP_TIMER with correct values', () => {
      const { result } = renderHook(() => useSleepTimer())
      act(() => {
        result.current.start(3600000, 600000)
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'START_SLEEP_TIMER',
        payload: { totalDurationMs: 3600000, fadeDurationMs: 600000 },
      })
    })
  })

  describe('pause', () => {
    it('dispatches PAUSE_SLEEP_TIMER and calls engine.pauseAll', () => {
      mockState.sleepTimer = makeTimer()
      const { result } = renderHook(() => useSleepTimer())
      act(() => {
        result.current.pause()
      })
      expect(mockEngine.pauseAll).toHaveBeenCalled()
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'PAUSE_SLEEP_TIMER' })
    })

    it('freezes fades when pausing during fade phase', () => {
      mockState.sleepTimer = makeTimer({ phase: 'fading' })
      const { result } = renderHook(() => useSleepTimer())
      act(() => {
        result.current.pause()
      })
      expect(mockEngine.freezeFades).toHaveBeenCalled()
    })
  })

  describe('resume', () => {
    it('dispatches RESUME_SLEEP_TIMER and calls engine.resumeAll', () => {
      mockState.sleepTimer = makeTimer({ isPaused: true })
      const { result } = renderHook(() => useSleepTimer())
      act(() => {
        result.current.resume()
      })
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'RESUME_SLEEP_TIMER' })
      expect(mockEngine.resumeAll).toHaveBeenCalled()
    })
  })

  describe('cancel', () => {
    it('dispatches CANCEL_SLEEP_TIMER and shows toast', () => {
      mockState.sleepTimer = makeTimer()
      const { result } = renderHook(() => useSleepTimer())
      act(() => {
        result.current.cancel()
      })
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'CANCEL_SLEEP_TIMER' })
      expect(mockShowToast).toHaveBeenCalledWith('Timer cancelled')
    })
  })

  describe('self-correcting timer', () => {
    it('computes remaining from Date.now, not tick count', () => {
      const startTime = Date.now()
      mockState.sleepTimer = makeTimer({
        startTime,
        totalDurationMs: 60000,
        fadeDurationMs: 10000,
      })
      mockState.activeSounds = [{ soundId: 'rain', volume: 0.6, label: 'Rain' }]

      const { result } = renderHook(() => useSleepTimer())

      // Advance by 5 seconds — one tick fires, recomputes from wall clock
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Date.now() has advanced by 5s via fake timers
      const elapsed = Date.now() - startTime
      const expected = 60000 - elapsed
      // Remaining should match wall-clock computation, not 5 tick decrements
      expect(result.current.remainingMs).toBeLessThanOrEqual(expected + 100)
      expect(result.current.remainingMs).toBeGreaterThanOrEqual(expected - 100)
    })
  })

  describe('phase transition', () => {
    it('transitions from full-volume to fading and schedules fade', () => {
      const totalMs = 60000  // 60s
      const fadeMs = 10000   // 10s
      // Start 49s ago — 11s remaining, about to cross fade threshold
      const startTime = Date.now() - 49000

      mockState.sleepTimer = makeTimer({
        startTime,
        totalDurationMs: totalMs,
        fadeDurationMs: fadeMs,
      })
      mockState.activeSounds = [{ soundId: 'rain', volume: 0.6, label: 'Rain' }]

      renderHook(() => useSleepTimer())

      // Advance past the fade threshold
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_TIMER_PHASE',
        payload: { phase: 'fading' },
      })
      expect(mockEngine.scheduleSleepFade).toHaveBeenCalledWith(10, false, true)
    })
  })

  describe('timer completion', () => {
    it('completes and pauses all audio', () => {
      // 2 seconds left
      const startTime = Date.now() - 58000
      mockState.sleepTimer = makeTimer({
        startTime,
        totalDurationMs: 60000,
        fadeDurationMs: 10000,
        phase: 'fading',
      })

      renderHook(() => useSleepTimer())

      // Advance past completion
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(mockEngine.pauseAll).toHaveBeenCalled()
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'COMPLETE_SLEEP_TIMER' })
      expect(mockShowToast).toHaveBeenCalledWith('Timer complete')
    })
  })

  describe('foreground ending naturally', () => {
    it('triggers breatheUpAmbient when foreground becomes null', () => {
      mockState.sleepTimer = makeTimer()
      mockState.foregroundContent = { contentId: '1', title: 'Psalm 23' }
      mockState.activeSounds = [{ soundId: 'rain', volume: 0.6, label: 'Rain' }]

      const { rerender } = renderHook(() => useSleepTimer())

      // Simulate foreground ending
      mockState.foregroundContent = null
      rerender()

      expect(mockEngine.breatheUpAmbient).toHaveBeenCalledWith(5000)
    })
  })

  describe('fadeStatus', () => {
    it('returns none when far from fade', () => {
      mockState.sleepTimer = makeTimer({ totalDurationMs: 3600000, fadeDurationMs: 600000 })
      const { result } = renderHook(() => useSleepTimer())
      expect(result.current.fadeStatus).toBe('none')
    })

    it('returns approaching when within 2x fade duration', () => {
      // 15min remaining out of 60min, with 10min fade → within 2×10min=20min
      mockState.sleepTimer = makeTimer({
        totalDurationMs: 3600000,
        fadeDurationMs: 600000,
        startTime: Date.now() - 2700000, // 45min elapsed, 15min remaining
      })
      const { result } = renderHook(() => useSleepTimer())
      expect(result.current.fadeStatus).toBe('approaching')
    })

    it('returns fading when in fade phase', () => {
      mockState.sleepTimer = makeTimer({ phase: 'fading' })
      const { result } = renderHook(() => useSleepTimer())
      expect(result.current.fadeStatus).toBe('fading')
    })
  })

  describe('play/pause sync', () => {
    it('pauses timer when audio is paused externally', () => {
      mockState.sleepTimer = makeTimer()
      mockState.isPlaying = true
      mockState.activeSounds = [{ soundId: 'rain', volume: 0.6, label: 'Rain' }]

      const { rerender } = renderHook(() => useSleepTimer())

      // Simulate external pause (user pauses via pill or keyboard)
      mockState.isPlaying = false
      rerender()

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'PAUSE_SLEEP_TIMER' })
    })
  })

  describe('new sounds during fade', () => {
    it('resumes fade when new sounds are added during fading phase', () => {
      mockState.sleepTimer = makeTimer({ phase: 'fading' })
      mockState.activeSounds = [{ soundId: 'rain', volume: 0.6, label: 'Rain' }]
      mockState.isPlaying = true

      const { rerender } = renderHook(() => useSleepTimer())

      // Add a new sound while fading
      mockState.activeSounds = [
        { soundId: 'rain', volume: 0.6, label: 'Rain' },
        { soundId: 'fire', volume: 0.5, label: 'Fire' },
      ]
      rerender()

      expect(mockEngine.resumeSleepFade).toHaveBeenCalled()
    })
  })

  describe('auto-cancel', () => {
    it('cancels timer when all audio is removed', () => {
      mockState.sleepTimer = makeTimer()
      mockState.isPlaying = false
      mockState.activeSounds = []
      mockState.foregroundContent = null

      renderHook(() => useSleepTimer())

      // The hook should detect no audio content and cancel
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'CANCEL_SLEEP_TIMER' })
    })
  })
})
