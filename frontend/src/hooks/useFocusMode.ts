import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// --- Types ---

export interface FocusModeSettings {
  enabled: boolean
  delay: number // 3000 | 6000 | 12000
  dimOrbs: boolean
}

export interface FocusModeReturn {
  // Visual state
  chromeOpacity: 0 | 1
  chromePointerEvents: 'auto' | 'none'
  chromeTransitionMs: number // 600 (fading out) or 200 (fading in)
  vignetteVisible: boolean
  dimmed: boolean // forward-compatible orb dimming
  isManuallyArmed: boolean

  // Actions
  triggerFocused: () => void
  pauseFocusMode: () => void
  resumeFocusMode: () => void

  // Settings
  settings: FocusModeSettings
  updateFocusSetting: <K extends keyof FocusModeSettings>(
    key: K,
    value: FocusModeSettings[K],
  ) => void
}

// --- localStorage keys ---

const KEY_ENABLED = 'wr_bible_focus_enabled'
const KEY_DELAY = 'wr_bible_focus_delay'
const KEY_DIM_ORBS = 'wr_bible_focus_dim_orbs'
const KEY_MIGRATION_V2 = 'wr_bible_focus_v2_migrated'

// --- Defaults ---

const DEFAULT_SETTINGS: FocusModeSettings = {
  enabled: false,
  delay: 6000,
  dimOrbs: true,
}

// --- Helpers ---

function loadSettings(): FocusModeSettings {
  // BB-51 one-time migration: legacy users with wr_bible_focus_enabled='true' from
  // before BB-50 still have focus mode auto-activating. Reset to default (false)
  // once per browser, then honor the user's explicit toggle going forward.
  const migrated = localStorage.getItem(KEY_MIGRATION_V2)
  if (migrated !== 'true') {
    const legacyValue = localStorage.getItem(KEY_ENABLED)
    if (legacyValue === 'true') {
      localStorage.removeItem(KEY_ENABLED)
    }
    localStorage.setItem(KEY_MIGRATION_V2, 'true')
  }

  const enabled = localStorage.getItem(KEY_ENABLED)
  const delay = localStorage.getItem(KEY_DELAY)
  const dimOrbs = localStorage.getItem(KEY_DIM_ORBS)

  return {
    enabled: enabled !== null ? enabled === 'true' : DEFAULT_SETTINGS.enabled,
    delay: delay !== null ? Number(delay) : DEFAULT_SETTINGS.delay,
    dimOrbs: dimOrbs !== null ? dimOrbs === 'true' : DEFAULT_SETTINGS.dimOrbs,
  }
}

function saveSettings(settings: FocusModeSettings) {
  localStorage.setItem(KEY_ENABLED, String(settings.enabled))
  localStorage.setItem(KEY_DELAY, String(settings.delay))
  localStorage.setItem(KEY_DIM_ORBS, String(settings.dimOrbs))
}

// --- Constants ---

const FADE_OUT_MS = 600
const FADE_IN_MS = 200
const MOUSEMOVE_DEBOUNCE_MS = 100
const JITTER_THRESHOLD_PX = 5

// --- Hook ---

type Phase = 'idle' | 'active' | 'focused'

export function useFocusMode(): FocusModeReturn {
  const reducedMotion = useReducedMotion()

  // Settings state (drives UI)
  const [settings, setSettings] = useState<FocusModeSettings>(loadSettings)

  // Visual output state (drives UI)
  const [chromeOpacity, setChromeOpacity] = useState<0 | 1>(1)
  const [chromePointerEvents, setChromePointerEvents] = useState<'auto' | 'none'>('auto')
  const [vignetteVisible, setVignetteVisible] = useState(false)
  const [isManuallyArmed, setIsManuallyArmed] = useState(false)

  // Phase ref (not state — avoids re-render on every interaction)
  const phaseRef = useRef<Phase>('idle')

  // Transition direction for dynamic duration
  const transitionDirectionRef = useRef<'in' | 'out'>('in')

  // Timers
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerEventsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pause ref-counting
  const pauseCountRef = useRef(0)

  // Mousemove debounce
  const mousemoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deltaAccumulatorRef = useRef({ x: 0, y: 0 })

  // Manual armed ref (source of truth; state synced for render)
  const manuallyArmedRef = useRef(false)

  // Settings ref for use in callbacks without stale closures
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // Reduced motion ref
  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion

  // --- Clear all timers ---
  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    if (pointerEventsTimerRef.current) {
      clearTimeout(pointerEventsTimerRef.current)
      pointerEventsTimerRef.current = null
    }
    if (mousemoveTimerRef.current) {
      clearTimeout(mousemoveTimerRef.current)
      mousemoveTimerRef.current = null
    }
  }, [])

  // --- Phase transitions ---

  const transitionToIdle = useCallback(() => {
    clearAllTimers()
    phaseRef.current = 'idle'
    transitionDirectionRef.current = 'in'
    setChromeOpacity(1)
    setChromePointerEvents('auto')
    setVignetteVisible(false)
  }, [clearAllTimers])

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      // Transition active → focused
      phaseRef.current = 'focused'
      transitionDirectionRef.current = 'out'
      setChromeOpacity(0)
      setVignetteVisible(true)

      // Delay pointer-events: none until after fade-out
      const peDelay = reducedMotionRef.current ? 0 : FADE_OUT_MS
      pointerEventsTimerRef.current = setTimeout(() => {
        setChromePointerEvents('none')
      }, peDelay)
    }, settingsRef.current.delay)
  }, [])

  const transitionToActive = useCallback(() => {
    phaseRef.current = 'active'
    transitionDirectionRef.current = 'in'
    // Immediately restore pointer-events before opacity change
    if (pointerEventsTimerRef.current) {
      clearTimeout(pointerEventsTimerRef.current)
      pointerEventsTimerRef.current = null
    }
    setChromePointerEvents('auto')
    setChromeOpacity(1)
    setVignetteVisible(false)
    startIdleTimer()
  }, [startIdleTimer])

  const transitionToFocused = useCallback(() => {
    if (!settingsRef.current.enabled) return
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    phaseRef.current = 'focused'
    transitionDirectionRef.current = 'out'
    setChromeOpacity(0)
    setVignetteVisible(true)

    const peDelay = reducedMotionRef.current ? 0 : FADE_OUT_MS
    pointerEventsTimerRef.current = setTimeout(() => {
      setChromePointerEvents('none')
    }, peDelay)
  }, [])

  // --- Activity handler ---

  const handleActivity = useCallback(() => {
    const phase = phaseRef.current
    if (phase === 'idle') return

    // Clear armed state
    if (manuallyArmedRef.current) {
      manuallyArmedRef.current = false
      setIsManuallyArmed(false)
    }

    if (phase === 'focused') {
      transitionToActive()
    } else if (phase === 'active') {
      // Reset the idle timer
      startIdleTimer()
    }
  }, [transitionToActive, startIdleTimer])

  // --- Public actions ---

  const triggerFocused = useCallback(() => {
    if (!settingsRef.current.enabled) return
    manuallyArmedRef.current = true
    setIsManuallyArmed(true)
    transitionToFocused()
  }, [transitionToFocused])

  const pauseFocusMode = useCallback(() => {
    pauseCountRef.current += 1
    if (pauseCountRef.current === 1) {
      transitionToIdle()
    }
  }, [transitionToIdle])

  const resumeFocusMode = useCallback(() => {
    pauseCountRef.current = Math.max(0, pauseCountRef.current - 1)
    if (pauseCountRef.current === 0 && settingsRef.current.enabled) {
      transitionToActive()
    }
  }, [transitionToActive])

  // --- Settings updater ---

  const updateFocusSetting = useCallback(
    <K extends keyof FocusModeSettings>(key: K, value: FocusModeSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value }
        saveSettings(next)

        // If disabling, immediately go idle
        if (key === 'enabled' && value === false) {
          transitionToIdle()
        }

        return next
      })
    },
    [transitionToIdle],
  )

  // --- Start/stop focus mode based on enabled + pause state ---

  useEffect(() => {
    if (settings.enabled && pauseCountRef.current === 0) {
      // Transition to active and start the idle timer
      phaseRef.current = 'active'
      startIdleTimer()
    } else {
      transitionToIdle()
    }

    return () => {
      clearAllTimers()
    }
    // Only re-run when enabled changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enabled])

  // --- Event listeners ---

  useEffect(() => {
    const onMousemove = (e: MouseEvent) => {
      // Accumulate delta
      deltaAccumulatorRef.current.x += Math.abs(e.movementX)
      deltaAccumulatorRef.current.y += Math.abs(e.movementY)

      // Debounce: only process after MOUSEMOVE_DEBOUNCE_MS of quiet
      if (mousemoveTimerRef.current) clearTimeout(mousemoveTimerRef.current)
      mousemoveTimerRef.current = setTimeout(() => {
        const totalDelta =
          deltaAccumulatorRef.current.x + deltaAccumulatorRef.current.y
        if (totalDelta > JITTER_THRESHOLD_PX) {
          handleActivity()
        }
        // Reset accumulator
        deltaAccumulatorRef.current = { x: 0, y: 0 }
      }, MOUSEMOVE_DEBOUNCE_MS)
    }

    const onDirect = () => handleActivity()

    window.addEventListener('mousemove', onMousemove)
    window.addEventListener('touchstart', onDirect)
    window.addEventListener('scroll', onDirect, { passive: true })
    window.addEventListener('keydown', onDirect)
    window.addEventListener('wheel', onDirect, { passive: true })
    window.addEventListener('focus', onDirect)

    return () => {
      window.removeEventListener('mousemove', onMousemove)
      window.removeEventListener('touchstart', onDirect)
      window.removeEventListener('scroll', onDirect)
      window.removeEventListener('keydown', onDirect)
      window.removeEventListener('wheel', onDirect)
      window.removeEventListener('focus', onDirect)
    }
  }, [handleActivity])

  // --- Compute transition duration ---

  const chromeTransitionMs = reducedMotion
    ? 0
    : transitionDirectionRef.current === 'out'
      ? FADE_OUT_MS
      : FADE_IN_MS

  return {
    chromeOpacity,
    chromePointerEvents,
    chromeTransitionMs,
    vignetteVisible,
    dimmed: settings.dimOrbs && vignetteVisible,
    isManuallyArmed,

    triggerFocused,
    pauseFocusMode,
    resumeFocusMode,

    settings,
    updateFocusSetting,
  }
}
