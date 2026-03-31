import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import { AUDIO_CONFIG } from '@/constants/audio'
import { useSleepTimerControls } from './AudioProvider'
import { TimerProgressRing } from './TimerProgressRing'

const TIMER_OPTIONS = AUDIO_CONFIG.SLEEP_TIMER_OPTIONS
const FADE_OPTIONS = AUDIO_CONFIG.FADE_DURATION_OPTIONS
const DEFAULT_FADE = AUDIO_CONFIG.FADE_DURATION_OPTIONS[1]

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function formatMinutes(ms: number): string {
  const min = Math.round(ms / 60000)
  return `${min} min`
}

export function TimerTabContent() {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { showToast } = useToast()
  const controls = useSleepTimerControls()

  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [customDuration, setCustomDuration] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [selectedFade, setSelectedFade] = useState<number>(DEFAULT_FADE)

  // aria-live ref for minute-based announcements
  const ariaLiveRef = useRef<HTMLDivElement>(null)
  const lastAnnouncedMinRef = useRef<number>(-1)

  // Refs for roving tabindex on radiogroups
  const timerButtonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const fadeButtonRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Announce remaining time every minute
  useEffect(() => {
    if (!controls.isActive || controls.isPaused) return
    const remainingMin = Math.round(controls.remainingMs / 60000)
    if (remainingMin !== lastAnnouncedMinRef.current && remainingMin >= 0) {
      lastAnnouncedMinRef.current = remainingMin
      if (ariaLiveRef.current) {
        ariaLiveRef.current.textContent = `${remainingMin} minute${remainingMin !== 1 ? 's' : ''} remaining`
      }
    }
  }, [controls.isActive, controls.isPaused, controls.remainingMs])

  // Seed aria-live region when active view mounts
  useEffect(() => {
    if (controls.isActive && ariaLiveRef.current) {
      const remainingMin = Math.round(controls.remainingMs / 60000)
      ariaLiveRef.current.textContent = `Sleep timer active. ${remainingMin} minute${remainingMin !== 1 ? 's' : ''} remaining`
    }
    // Only seed on mount of active view, not every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls.isActive])

  // Get effective timer duration in minutes
  const effectiveDurationMin = isCustom
    ? (customDuration ? Math.max(5, Math.min(480, Number(customDuration) || 0)) : null)
    : selectedDuration

  // Fade auto-adjustment
  const adjustFade = useCallback(
    (timerMin: number, currentFade: number): number => {
      if (currentFade < timerMin) return currentFade
      // Find largest option < timer
      const validOptions = [...FADE_OPTIONS].filter((f) => f < timerMin)
      if (validOptions.length > 0) {
        return validOptions[validOptions.length - 1]
      }
      return FADE_OPTIONS[0]
    },
    [],
  )

  // Roving tabindex indices
  const timerCount = TIMER_OPTIONS.length + 1 // presets + Custom
  const timerSelectedIdx = isCustom
    ? TIMER_OPTIONS.length
    : selectedDuration !== null
      ? TIMER_OPTIONS.indexOf(selectedDuration as (typeof TIMER_OPTIONS)[number])
      : -1
  const timerFocusableIdx = timerSelectedIdx >= 0 ? timerSelectedIdx : 0

  const fadeSelectedIdx = FADE_OPTIONS.indexOf(selectedFade as (typeof FADE_OPTIONS)[number])
  const fadeFocusableIdx = fadeSelectedIdx >= 0 ? fadeSelectedIdx : 0

  function handleRadioKeyDown(
    e: React.KeyboardEvent,
    refs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
    count: number,
  ) {
    const currentIdx = refs.current.findIndex((el) => el === e.currentTarget)
    if (currentIdx < 0) return

    let nextIdx = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIdx = (currentIdx + 1) % count
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIdx = (currentIdx - 1 + count) % count
    } else if (e.key === 'Home') {
      e.preventDefault()
      nextIdx = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      nextIdx = count - 1
    }

    if (nextIdx >= 0) {
      refs.current[nextIdx]?.focus()
      refs.current[nextIdx]?.click()
    }
  }

  const handlePresetClick = (min: number) => {
    setSelectedDuration(min)
    setIsCustom(false)
    setCustomDuration('')

    const adjustedFade = adjustFade(min, selectedFade)
    if (adjustedFade !== selectedFade) {
      setSelectedFade(adjustedFade)
      showToast('Fade adjusted to fit timer')
    }
  }

  const handleCustomToggle = () => {
    setIsCustom(true)
    setSelectedDuration(null)
  }

  const handleCustomChange = (val: string) => {
    setCustomDuration(val)
    const num = Number(val)
    if (num >= 5 && num <= 480) {
      const adjustedFade = adjustFade(num, selectedFade)
      if (adjustedFade !== selectedFade) {
        setSelectedFade(adjustedFade)
        showToast('Fade adjusted to fit timer')
      }
    }
  }

  const handleFadeClick = (min: number) => {
    if (effectiveDurationMin && min >= effectiveDurationMin) {
      const adjusted = adjustFade(effectiveDurationMin, min)
      setSelectedFade(adjusted)
      showToast('Fade adjusted to fit timer')
    } else {
      setSelectedFade(min)
    }
  }

  const handleStart = () => {
    if (!effectiveDurationMin || effectiveDurationMin < 5) return

    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to use the sleep timer')
      return
    }

    controls.start(
      effectiveDurationMin * 60 * 1000,
      selectedFade * 60 * 1000,
    )
  }

  // Active countdown view
  if (controls.isActive) {
    const progress = controls.totalDurationMs > 0
      ? controls.remainingMs / controls.totalDurationMs
      : 0

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {/* Progress ring + countdown */}
        <div className="relative flex items-center justify-center">
          <TimerProgressRing progress={progress} size={160} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold text-white">
              {formatTime(controls.remainingMs)}
            </span>
            <span className="text-sm text-white/50">remaining</span>
          </div>
        </div>

        {/* Fade status */}
        {controls.fadeStatus === 'approaching' && (
          <p className="text-sm text-white/50">
            Fading in {formatTime(controls.fadeRemainingMs)}
          </p>
        )}
        {controls.fadeStatus === 'fading' && (
          <p className="text-sm text-white/50" aria-live="assertive">
            Fading now...
          </p>
        )}

        {/* Control buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={controls.isPaused ? controls.resume : controls.pause}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 px-6 py-2 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
            aria-label={controls.isPaused ? 'Resume sleep timer' : 'Pause sleep timer'}
          >
            {controls.isPaused ? <Play size={16} /> : <Pause size={16} />}
            {controls.isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={controls.cancel}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-white/70 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
            aria-label="Cancel sleep timer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Read-only fade */}
        <p className="text-xs text-white/50">
          Fade: {formatMinutes(controls.fadeDurationMs)}
        </p>

        {/* aria-live region — updated every minute, not every second */}
        <div ref={ariaLiveRef} aria-live="polite" className="sr-only" />
      </div>
    )
  }

  // Setup view
  const hasValidDuration = effectiveDurationMin !== null && effectiveDurationMin >= 5

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
      <p className="text-sm uppercase tracking-wider text-white/50">Sleep Timer</p>

      {/* Timer Duration */}
      <div>
        <p className="mb-2 text-sm text-white/70">Set timer for...</p>
        <div
          role="radiogroup"
          aria-label="Timer duration"
          className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap"
        >
          {TIMER_OPTIONS.map((min, i) => (
            <button
              key={min}
              ref={(el) => { timerButtonRefs.current[i] = el }}
              role="radio"
              aria-checked={!isCustom && selectedDuration === min}
              tabIndex={i === timerFocusableIdx ? 0 : -1}
              onClick={() => handlePresetClick(min)}
              onKeyDown={(e) => handleRadioKeyDown(e, timerButtonRefs, timerCount)}
              className={cn(
                'min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt',
                !isCustom && selectedDuration === min
                  ? 'bg-primary text-white'
                  : 'border border-white/20 text-white/70 hover:bg-white/10',
              )}
            >
              {min} min
            </button>
          ))}
          <button
            ref={(el) => { timerButtonRefs.current[TIMER_OPTIONS.length] = el }}
            role="radio"
            aria-checked={isCustom}
            tabIndex={TIMER_OPTIONS.length === timerFocusableIdx ? 0 : -1}
            onClick={handleCustomToggle}
            onKeyDown={(e) => handleRadioKeyDown(e, timerButtonRefs, timerCount)}
            className={cn(
              'min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt',
              isCustom
                ? 'bg-primary text-white'
                : 'border border-white/20 text-white/70 hover:bg-white/10',
            )}
          >
            Custom
          </button>
        </div>

        {isCustom && (
          <div className="mt-2">
            <label htmlFor="custom-timer-input" className="sr-only">
              Custom timer duration in minutes
            </label>
            <input
              id="custom-timer-input"
              type="number"
              min={5}
              max={480}
              step={1}
              value={customDuration}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="Minutes (5-480)"
              className="min-h-[44px] w-full rounded-lg border border-white/20 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
            />
          </div>
        )}
      </div>

      {/* Fade Duration */}
      <div>
        <p className="mb-2 text-sm text-white/50">Fade out over...</p>
        <div
          role="radiogroup"
          aria-label="Fade duration"
          className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap"
        >
          {FADE_OPTIONS.map((min, i) => (
            <button
              key={min}
              ref={(el) => { fadeButtonRefs.current[i] = el }}
              role="radio"
              aria-checked={selectedFade === min}
              tabIndex={i === fadeFocusableIdx ? 0 : -1}
              onClick={() => handleFadeClick(min)}
              onKeyDown={(e) => handleRadioKeyDown(e, fadeButtonRefs, FADE_OPTIONS.length)}
              className={cn(
                'min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt',
                selectedFade === min
                  ? 'bg-primary text-white'
                  : 'border border-white/20 text-white/70 hover:bg-white/10',
              )}
            >
              {min} min
            </button>
          ))}
        </div>
      </div>

      {/* Start Timer button */}
      <button
        onClick={handleStart}
        disabled={!hasValidDuration}
        aria-label={
          hasValidDuration
            ? `Start sleep timer for ${effectiveDurationMin} minutes with ${selectedFade} minute fade`
            : 'Select a timer duration to start'
        }
        className={cn(
          'w-full rounded-lg bg-primary py-3 px-8 font-semibold text-white transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt',
          !hasValidDuration && 'cursor-not-allowed opacity-50',
        )}
      >
        Start Timer
      </button>
    </div>
  )
}
