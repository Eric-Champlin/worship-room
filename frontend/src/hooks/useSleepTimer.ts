import { useCallback, useEffect, useRef, useState } from 'react'
import { useAudioState, useAudioDispatch, useAudioEngine } from '@/components/audio/AudioProvider'
import { useToast } from '@/components/ui/Toast'

export interface SleepTimerControls {
  // Computed values
  remainingMs: number
  totalDurationMs: number
  fadeDurationMs: number
  phase: 'full-volume' | 'fading' | 'complete' | null
  isActive: boolean
  isPaused: boolean

  // Fade status
  fadeStatus: 'none' | 'approaching' | 'fading'
  fadeRemainingMs: number

  // Actions
  start: (totalDurationMs: number, fadeDurationMs: number) => void
  pause: () => void
  resume: () => void
  cancel: () => void
}

function computeElapsedMs(timer: {
  startTime: number
  pausedElapsedMs: number
  isPaused: boolean
}): number {
  return timer.pausedElapsedMs + (timer.isPaused ? 0 : Date.now() - timer.startTime)
}

export function useSleepTimer(): SleepTimerControls {
  const state = useAudioState()
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()
  const { showToast } = useToast()

  // Force re-render counter driven by the interval
  const [, setTick] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevForegroundRef = useRef(state.foregroundContent)
  const prevIsPlayingRef = useRef(state.isPlaying)
  const prevActiveSoundsCountRef = useRef(state.activeSounds.length)
  const fadeScheduledRef = useRef(false)

  const timer = state.sleepTimer

  // Compute remaining time from wall clock
  const elapsedMs = timer ? computeElapsedMs(timer) : 0
  const remainingMs = timer ? Math.max(0, timer.totalDurationMs - elapsedMs) : 0
  const fullVolumeMs = timer ? timer.totalDurationMs - timer.fadeDurationMs : 0
  const msUntilFade = timer ? Math.max(0, fullVolumeMs - elapsedMs) : 0

  // Fade status
  let fadeStatus: 'none' | 'approaching' | 'fading' = 'none'
  if (timer?.isActive) {
    if (timer.phase === 'fading') {
      fadeStatus = 'fading'
    } else if (remainingMs <= 2 * timer.fadeDurationMs) {
      fadeStatus = 'approaching'
    }
  }

  // Start the timer
  const start = useCallback(
    (totalDurationMs: number, fadeDurationMs: number) => {
      fadeScheduledRef.current = false
      dispatch({
        type: 'START_SLEEP_TIMER',
        payload: { totalDurationMs, fadeDurationMs },
      })
    },
    [dispatch],
  )

  // Pause the timer
  const pause = useCallback(() => {
    if (!timer?.isActive) return

    // Freeze fades if in fade phase
    if (timer.phase === 'fading') {
      engine?.freezeFades()
    }
    engine?.pauseAll()
    dispatch({ type: 'PAUSE_SLEEP_TIMER' })
  }, [timer, engine, dispatch])

  // Resume the timer
  const resume = useCallback(() => {
    if (!timer?.isActive || !timer.isPaused) return

    dispatch({ type: 'RESUME_SLEEP_TIMER' })
    engine?.resumeAll()

    // If in fade phase, reschedule fades
    if (timer.phase === 'fading') {
      const elapsed = computeElapsedMs(timer)
      const remaining = Math.max(0, timer.totalDurationMs - elapsed)
      const fadeElapsed = timer.fadeDurationMs - remaining
      const fadeProgress = Math.min(1, Math.max(0, fadeElapsed / timer.fadeDurationMs))
      const hasForeground = state.foregroundContent !== null
      const hasAmbient = state.activeSounds.length > 0

      engine?.resumeSleepFade(remaining, fadeProgress, hasForeground, hasAmbient)
    }
  }, [timer, engine, dispatch, state.foregroundContent, state.activeSounds.length])

  // Cancel the timer
  const cancel = useCallback(() => {
    if (timer?.phase === 'fading') {
      engine?.freezeFades()
    }
    dispatch({ type: 'CANCEL_SLEEP_TIMER' })
    fadeScheduledRef.current = false
    showToast('Timer cancelled')
  }, [timer, engine, dispatch, showToast])

  // Interval for countdown ticks + phase transitions
  useEffect(() => {
    if (!timer?.isActive || timer.isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      const elapsed = computeElapsedMs(timer)
      const remaining = Math.max(0, timer.totalDurationMs - elapsed)

      // Timer complete
      if (remaining <= 0) {
        engine?.pauseAll()
        dispatch({ type: 'COMPLETE_SLEEP_TIMER' })
        fadeScheduledRef.current = false
        showToast('Timer complete')
        return
      }

      // Phase transition: full-volume → fading
      if (
        timer.phase === 'full-volume' &&
        remaining <= timer.fadeDurationMs &&
        !fadeScheduledRef.current
      ) {
        fadeScheduledRef.current = true
        dispatch({ type: 'UPDATE_TIMER_PHASE', payload: { phase: 'fading' } })

        const hasForeground = state.foregroundContent !== null
        const hasAmbient = state.activeSounds.length > 0
        engine?.scheduleSleepFade(
          timer.fadeDurationMs / 1000,
          hasForeground,
          hasAmbient,
        )
      }

      // Force re-render to update countdown display
      setTick((t) => t + 1)
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- timer properties listed individually for granular reactivity; adding `timer` object would be redundant
  }, [
    timer?.isActive,
    timer?.isPaused,
    timer?.phase,
    timer?.totalDurationMs,
    timer?.fadeDurationMs,
    timer?.startTime,
    timer?.pausedElapsedMs,
    engine,
    dispatch,
    showToast,
    state.foregroundContent,
    state.activeSounds.length,
  ])

  // Foreground ending naturally → breathe up ambient
  useEffect(() => {
    const prevFg = prevForegroundRef.current
    prevForegroundRef.current = state.foregroundContent

    if (
      prevFg !== null &&
      state.foregroundContent === null &&
      timer?.isActive &&
      state.activeSounds.length > 0
    ) {
      engine?.breatheUpAmbient(5000)
    }
  }, [state.foregroundContent, timer?.isActive, state.activeSounds.length, engine])

  // Sync timer pause/resume with manual play/pause (spacebar, pill button)
  useEffect(() => {
    const wasPlaying = prevIsPlayingRef.current
    prevIsPlayingRef.current = state.isPlaying

    if (!timer?.isActive) return

    // Manual pause → pause timer (but don't call engine.pauseAll again)
    if (wasPlaying && !state.isPlaying && !timer.isPaused) {
      if (timer.phase === 'fading') {
        engine?.freezeFades()
      }
      dispatch({ type: 'PAUSE_SLEEP_TIMER' })
    }

    // Manual resume → resume timer (but don't call engine.resumeAll again)
    if (!wasPlaying && state.isPlaying && timer.isPaused) {
      dispatch({ type: 'RESUME_SLEEP_TIMER' })
      if (timer.phase === 'fading') {
        const elapsed = computeElapsedMs(timer)
        const remaining = Math.max(0, timer.totalDurationMs - elapsed)
        const fadeElapsed = timer.fadeDurationMs - remaining
        const fadeProgress = Math.min(1, Math.max(0, fadeElapsed / timer.fadeDurationMs))
        const hasForeground = state.foregroundContent !== null
        const hasAmbient = state.activeSounds.length > 0
        engine?.resumeSleepFade(remaining, fadeProgress, hasForeground, hasAmbient)
      }
    }
  }, [state.isPlaying, timer, engine, dispatch, state.foregroundContent, state.activeSounds.length])

  // New sounds added during fade → apply current fade level
  useEffect(() => {
    const prevCount = prevActiveSoundsCountRef.current
    prevActiveSoundsCountRef.current = state.activeSounds.length

    if (
      timer?.isActive &&
      timer.phase === 'fading' &&
      state.activeSounds.length > prevCount
    ) {
      // Reschedule fades to include new sounds at current fade progress
      const elapsed = computeElapsedMs(timer)
      const remaining = Math.max(0, timer.totalDurationMs - elapsed)
      const fadeElapsed = timer.fadeDurationMs - remaining
      const fadeProgress = Math.min(1, Math.max(0, fadeElapsed / timer.fadeDurationMs))
      const hasForeground = state.foregroundContent !== null
      engine?.resumeSleepFade(remaining, fadeProgress, hasForeground, true)
    }
  }, [state.activeSounds.length, timer, engine, state.foregroundContent])

  // User stops all audio during timer → auto-cancel
  useEffect(() => {
    if (
      timer?.isActive &&
      !state.isPlaying &&
      state.activeSounds.length === 0 &&
      state.foregroundContent === null &&
      !timer.isPaused
    ) {
      dispatch({ type: 'CANCEL_SLEEP_TIMER' })
      fadeScheduledRef.current = false
      showToast('Timer cancelled')
    }
  }, [
    timer?.isActive,
    timer?.isPaused,
    state.isPlaying,
    state.activeSounds.length,
    state.foregroundContent,
    dispatch,
    showToast,
  ])

  return {
    remainingMs,
    totalDurationMs: timer?.totalDurationMs ?? 0,
    fadeDurationMs: timer?.fadeDurationMs ?? 0,
    phase: timer?.isActive ? timer.phase : null,
    isActive: timer?.isActive ?? false,
    isPaused: timer?.isPaused ?? false,
    fadeStatus,
    fadeRemainingMs: msUntilFade,
    start,
    pause,
    resume,
    cancel,
  }
}
