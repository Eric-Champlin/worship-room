import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import {
  useSleepTimerControls,
  useAudioDispatch,
} from '@/components/audio/AudioProvider'
import { AUDIO_CONFIG } from '@/constants/audio'

interface SleepTimerPanelProps {
  isOpen: boolean
  onClose: () => void
}

function formatMinutes(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
}

export function SleepTimerPanel({ isOpen, onClose }: SleepTimerPanelProps) {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const sleepTimer = useSleepTimerControls()
  const dispatch = useAudioDispatch()

  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [isCustom, setIsCustom] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')
  const [selectedFade, setSelectedFade] = useState(10)

  const containerRef = useRef<HTMLDivElement>(null)
  const customInputRef = useRef<HTMLInputElement>(null)

  // Track if timer was started from this panel
  const [startedFromHere, setStartedFromHere] = useState(false)

  // Determine which state to show
  const timerWasActiveOnMount = useRef(sleepTimer.isActive)
  useEffect(() => {
    if (isOpen) {
      timerWasActiveOnMount.current = sleepTimer.isActive
    }
  }, [isOpen, sleepTimer.isActive])

  const isConflict = sleepTimer.isActive && !startedFromHere && timerWasActiveOnMount.current
  const isActiveFromHere = sleepTimer.isActive && startedFromHere

  // Click outside dismissal
  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen, onClose])

  // Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus custom input when selected
  useEffect(() => {
    if (isCustom) {
      customInputRef.current?.focus()
    }
  }, [isCustom])

  const handleStart = useCallback(() => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to use the sleep timer')
      return
    }

    const minutes = isCustom ? parseInt(customMinutes, 10) : selectedDuration
    if (!minutes || minutes < 1) return

    sleepTimer.start(minutes * 60 * 1000, selectedFade * 60 * 1000)
    setStartedFromHere(true)
    onClose()
  }, [isAuthenticated, authModal, isCustom, customMinutes, selectedDuration, selectedFade, sleepTimer, onClose])

  const handleCancel = useCallback(() => {
    sleepTimer.cancel()
    setStartedFromHere(false)
  }, [sleepTimer])

  const handleAdjust = useCallback(() => {
    dispatch({ type: 'OPEN_DRAWER' })
    onClose()
  }, [dispatch, onClose])

  const handleDurationSelect = (minutes: number) => {
    setSelectedDuration(minutes)
    setIsCustom(false)
  }

  const handleCustomSelect = () => {
    setIsCustom(true)
    setSelectedDuration(null)
  }

  if (!isOpen) return null

  const durationOptions = AUDIO_CONFIG.SLEEP_TIMER_OPTIONS
  const fadeOptions = [5, 10, 15] as const

  const effectiveDuration = isCustom ? parseInt(customMinutes, 10) : selectedDuration
  const canStart = effectiveDuration != null && effectiveDuration >= 1

  const startLabel = canStart
    ? `Start ${effectiveDuration} minute sleep timer with ${selectedFade} minute fade`
    : 'Start sleep timer'

  // Active timer state (started from here)
  if (isActiveFromHere) {
    return (
      <div
        ref={containerRef}
        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
        role="region"
        aria-label="Sleep timer active"
      >
        <p className="text-center text-lg font-semibold text-white">
          {formatMinutes(sleepTimer.remainingMs)}
        </p>
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-white/40 transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Cancel sleep timer"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Conflict state (timer started elsewhere)
  if (isConflict) {
    return (
      <div
        ref={containerRef}
        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
        role="region"
        aria-label="Sleep timer conflict"
      >
        <p className="text-center text-lg font-semibold text-white">
          {formatMinutes(sleepTimer.remainingMs)}
        </p>
        <p className="mt-1 text-center text-sm text-white/50" aria-live="polite">
          Timer already running from Music
        </p>
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={handleAdjust}
            className="text-sm text-primary underline transition-colors hover:text-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Adjust
          </button>
        </div>
      </div>
    )
  }

  // Setup state (no active timer)
  return (
    <div
      ref={containerRef}
      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
      role="region"
      aria-label="Sleep timer setup"
    >
      {/* Duration selection */}
      <div
        role="radiogroup"
        aria-label="Timer duration"
        className="flex flex-wrap gap-2"
      >
        {durationOptions.map((minutes) => (
          <button
            key={minutes}
            type="button"
            role="radio"
            aria-checked={selectedDuration === minutes && !isCustom}
            onClick={() => handleDurationSelect(minutes)}
            className={`min-h-[44px] rounded-full px-4 py-2 text-sm transition-colors ${
              selectedDuration === minutes && !isCustom
                ? 'bg-primary text-white'
                : 'border border-white/20 text-white/50 hover:text-white/70'
            }`}
          >
            {minutes}m
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={isCustom}
          onClick={handleCustomSelect}
          className={`min-h-[44px] rounded-full px-4 py-2 text-sm transition-colors ${
            isCustom
              ? 'bg-primary text-white'
              : 'border border-white/20 text-white/50 hover:text-white/70'
          }`}
        >
          Custom
        </button>
      </div>

      {/* Custom input */}
      {isCustom && (
        <div className="mt-3">
          <label htmlFor="custom-timer-input" className="sr-only">
            Custom timer duration in minutes
          </label>
          <input
            ref={customInputRef}
            id="custom-timer-input"
            type="number"
            min={5}
            max={480}
            step={5}
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            placeholder="Minutes (5-480)"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
        </div>
      )}

      {/* Fade duration */}
      <div className="mt-3">
        <span className="text-xs text-white/40">Fade duration</span>
        <div
          role="radiogroup"
          aria-label="Fade duration"
          className="mt-1 flex gap-2"
        >
          {fadeOptions.map((minutes) => (
            <button
              key={minutes}
              type="button"
              role="radio"
              aria-checked={selectedFade === minutes}
              onClick={() => setSelectedFade(minutes)}
              className={`min-h-[44px] rounded-full px-3 py-1 text-xs transition-colors ${
                selectedFade === minutes
                  ? 'bg-primary/20 text-primary'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {minutes}m
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        type="button"
        onClick={handleStart}
        disabled={!canStart}
        aria-label={startLabel}
        className="mt-4 w-full rounded-lg bg-primary py-2.5 font-medium text-white transition-colors hover:bg-primary-lt disabled:cursor-not-allowed disabled:opacity-50"
      >
        Start Timer
      </button>
    </div>
  )
}
