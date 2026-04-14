import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Square, Timer, User, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SleepTimerProgressRing } from './SleepTimerProgressRing'

interface AudioControlBarProps {
  playbackState: 'idle' | 'playing' | 'paused'
  currentVerseIndex: number
  totalVerses: number
  speed: number
  onSpeedChange: (speed: number) => void
  voiceGender: 'male' | 'female'
  onVoiceGenderChange: (gender: 'male' | 'female') => void
  availableVoiceCount: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onTimerClick?: () => void
  isTimerActive?: boolean
  isTimerPanelOpen?: boolean
  timerRemainingMs?: number
  timerTotalDurationMs?: number
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5]

export function AudioControlBar({
  playbackState,
  currentVerseIndex,
  totalVerses,
  speed,
  onSpeedChange,
  voiceGender,
  onVoiceGenderChange,
  availableVoiceCount,
  onPlay,
  onPause,
  onStop,
  onTimerClick,
  isTimerActive = false,
  isTimerPanelOpen = false,
  timerRemainingMs = 0,
  timerTotalDurationMs = 0,
}: AudioControlBarProps) {
  const [isStuck, setIsStuck] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Detect sticky state via IntersectionObserver on sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting)
      },
      { threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const isIdle = playbackState === 'idle'
  const isPlaying = playbackState === 'playing'

  const playButtonLabel = isIdle
    ? 'Play chapter'
    : isPlaying
      ? 'Pause reading'
      : 'Resume reading'

  const displayVerse = currentVerseIndex >= 0 ? currentVerseIndex + 1 : 1

  return (
    <>
      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} aria-hidden="true" className="h-0" />

      <div
        className={cn(
          'sticky top-0 z-30 rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm transition-shadow motion-reduce:transition-none',
          isStuck && 'shadow-md',
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Play/Pause + Stop */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              aria-label={playButtonLabel}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-primary transition-colors hover:bg-white/10"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={onStop}
              disabled={isIdle}
              aria-label="Stop reading"
              className={cn(
                'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors',
                isIdle
                  ? 'cursor-not-allowed text-white/20'
                  : 'text-white/50 hover:bg-white/10 hover:text-white/70',
              )}
            >
              <Square className="h-5 w-5" />
            </button>
          </div>

          {/* Speed pills */}
          <div
            role="radiogroup"
            aria-label="Reading speed"
            className="flex flex-shrink-0 gap-1 overflow-x-auto"
          >
            {SPEED_OPTIONS.map((s) => {
              const isSelected = speed === s
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Reading speed ${s}x`}
                  onClick={() => onSpeedChange(s)}
                  className={cn(
                    'min-h-[44px] rounded-full px-3 py-1 text-xs transition-colors',
                    isSelected
                      ? 'bg-primary/20 font-medium text-primary'
                      : 'text-white/70 hover:text-white',
                  )}
                >
                  {s}x
                </button>
              )
            })}
          </div>

          {/* Spacer for desktop */}
          <div className="hidden flex-1 sm:block" />

          {/* Progress text */}
          <span
            aria-live="polite"
            className="text-sm text-white/50"
          >
            Verse {displayVerse} of {totalVerses}
          </span>

          {/* Voice gender toggle */}
          {availableVoiceCount > 1 && (
            <div className="flex items-center gap-0">
              <button
                type="button"
                aria-label="Male voice"
                aria-pressed={voiceGender === 'male'}
                onClick={() => onVoiceGenderChange('male')}
                className={cn(
                  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors',
                  voiceGender === 'male' ? 'text-primary' : 'text-white/30',
                )}
              >
                <User className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Female voice"
                aria-pressed={voiceGender === 'female'}
                onClick={() => onVoiceGenderChange('female')}
                className={cn(
                  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors',
                  voiceGender === 'female' ? 'text-primary' : 'text-white/30',
                )}
              >
                <UserRound className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Sleep timer button + progress ring */}
          <div className="flex items-center">
            {isTimerActive && (
              <SleepTimerProgressRing
                remainingMs={timerRemainingMs}
                totalDurationMs={timerTotalDurationMs}
                onClick={onTimerClick ?? (() => {})}
              />
            )}
            {!isTimerActive && (
              <button
                type="button"
                onClick={onTimerClick}
                aria-label="Sleep timer"
                aria-expanded={isTimerPanelOpen}
                className={cn(
                  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors',
                  isTimerActive ? 'text-primary' : 'text-white/50 hover:text-white/70',
                )}
              >
                <Timer className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
