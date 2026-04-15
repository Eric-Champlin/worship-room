/**
 * BB-26 — AudioPlayerExpanded
 *
 * The full expanded sheet content: chapter/translation header, scrubber,
 * play/pause, speed picker, corner minimize/close, FCBH attribution footer.
 *
 * Accessibility:
 *   - Scrubber is a native <input type="range"> (keyboard-accessible by default)
 *   - Focus moves to the large play/pause on mount
 *   - Corner buttons use a 44×44 invisible hit area around a 32px visible circle
 *   - All buttons have aria-labels; speed picker uses aria-pressed
 *
 * License compliance:
 *   - FCBH attribution link is rendered unconditionally (even in error state)
 *   - href/target/rel enforced for DBP license requirements (spec 50a)
 */

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Minimize2, X, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'
import { ToggleSwitch } from '@/components/settings/ToggleSwitch'
import { SleepTimerPanel } from '@/components/bible/SleepTimerPanel'
import { formatSleepTimerRemaining } from '@/lib/audio/sleep-timer'
import type { PlaybackSpeed, SleepTimerInfo, SleepFadeInfo } from '@/types/bible-audio'

const SPEEDS: PlaybackSpeed[] = [0.75, 1.0, 1.25, 1.5, 2.0]

function formatMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

interface CornerButtonProps {
  icon: typeof Minimize2
  label: string
  onClick: () => void
}

function CornerButton({ icon: Icon, label, onClick }: CornerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-[44px] w-[44px] items-center justify-center"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  )
}

function SleepTimerButton({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isActive ? 'Sleep timer active — open settings' : 'Set sleep timer'}
      className="flex h-[44px] w-[44px] items-center justify-center"
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
          isActive
            ? 'bg-white/[0.08] border border-primary/30 shadow-[0_0_8px_rgba(109,40,217,0.2)]'
            : 'text-white/50 hover:bg-white/10 hover:text-white/80',
        )}
      >
        <Moon
          className={cn('h-4 w-4', isActive ? 'text-primary/80' : '')}
          aria-hidden="true"
        />
      </span>
    </button>
  )
}

function SleepTimerIndicator({
  sleepTimer,
  sleepFade,
  onClick,
}: {
  sleepTimer: SleepTimerInfo | null
  sleepFade: SleepFadeInfo | null
  onClick: () => void
}) {
  let text: string
  let ariaLabel: string

  if (sleepFade) {
    text = 'Fading...'
    ariaLabel = 'Sleep timer: fading out'
  } else if (sleepTimer?.type === 'end-of-chapter') {
    text = 'Ends with chapter'
    ariaLabel = 'Sleep timer: ends with chapter'
  } else if (sleepTimer?.type === 'end-of-book') {
    text = 'Ends with book'
    ariaLabel = 'Sleep timer: ends with book'
  } else if (sleepTimer) {
    text = formatSleepTimerRemaining(sleepTimer.remainingMs)
    const totalSeconds = Math.ceil(sleepTimer.remainingMs / 1000)
    const minutes = Math.ceil(totalSeconds / 60)
    ariaLabel = `Sleep timer: ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`
  } else {
    return null
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-white/[0.06] px-2 py-0.5"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <Moon className="h-3 w-3 text-primary/80" aria-hidden="true" />
      <span className="text-xs tabular-nums text-white/70">{text}</span>
    </button>
  )
}

function AttributionFooter() {
  return (
    <div className="mt-3 text-center">
      <a
        href="https://www.faithcomesbyhearing.com/bible-brain/legal"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded px-1 text-xs text-white/40 transition-colors hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        Audio by Faith Comes By Hearing
      </a>
    </div>
  )
}

export function AudioPlayerExpanded() {
  const { state, actions } = useAudioPlayer()
  const playButtonRef = useRef<HTMLButtonElement>(null)
  const startFromGenesisButtonRef = useRef<HTMLButtonElement>(null)
  const [sleepTimerOpen, setSleepTimerOpen] = useState(false)

  // Focus moves to the play button when the sheet first expands
  useEffect(() => {
    playButtonRef.current?.focus()
  }, [])

  // BB-29 — when end-of-Bible engages, move focus to the Start from
  // Genesis button so the primary action is keyboard-accessible.
  useEffect(() => {
    if (state.endOfBible) {
      startFromGenesisButtonRef.current?.focus()
    }
  }, [state.endOfBible])

  if (!state.track) return null

  const isPlaying = state.playbackState === 'playing'
  const isError = state.playbackState === 'error'
  const isEndOfBible = state.endOfBible
  const hasSleepTimer = state.sleepTimer !== null || state.sleepFade !== null

  return (
    <div className="flex h-[340px] flex-col px-6 py-4 sm:h-[300px] sm:px-8 sm:py-5">
      {/* Corner minimize + close */}
      <div className="flex items-center justify-between">
        <CornerButton
          icon={Minimize2}
          label="Minimize audio player"
          onClick={actions.minimize}
        />
        <SleepTimerButton
          isActive={hasSleepTimer}
          onClick={() => setSleepTimerOpen(true)}
        />
        <div className="flex-1" />
        <CornerButton icon={X} label="Close audio player" onClick={actions.close} />
      </div>

      {/* Chapter reference + translation */}
      <div className="mt-2 text-center">
        <p className="text-lg font-medium text-white">
          {state.track.bookDisplayName} {state.track.chapter}
        </p>
        <p className="mt-1 text-sm text-white/60">{state.track.translation}</p>
        {/* BB-28 sleep timer indicator */}
        {hasSleepTimer && (
          <SleepTimerIndicator
            sleepTimer={state.sleepTimer}
            sleepFade={state.sleepFade}
            onClick={() => setSleepTimerOpen(true)}
          />
        )}
      </div>

      {isError ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-white/70">
            {state.errorMessage ?? 'Audio unavailable — try another chapter'}
          </p>
          <button
            type="button"
            onClick={actions.dismissError}
            className="rounded px-2 py-1 text-sm text-white/50 underline underline-offset-2 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Dismiss
          </button>
        </div>
      ) : isEndOfBible ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-center text-base text-white/80">
            End of the Bible. Press play to start again from Genesis.
          </p>
          <button
            ref={startFromGenesisButtonRef}
            type="button"
            onClick={() => void actions.startFromGenesis()}
            aria-label="Start playback from Genesis 1"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <Play className="h-6 w-6 text-white" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          {/* Scrubber row */}
          <div className="mt-4 flex items-center gap-3">
            <span className="w-10 text-right text-xs tabular-nums text-white/60">
              {formatMMSS(state.currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(1, state.duration)}
              step={1}
              value={state.currentTime}
              onChange={(e) => actions.seek(Number(e.target.value))}
              aria-label="Seek audio position"
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.4)]"
            />
            <span className="w-10 text-xs tabular-nums text-white/60">
              {formatMMSS(state.duration)}
            </span>
          </div>

          {/* Play/pause + speed row */}
          <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-4">
            <button
              ref={playButtonRef}
              type="button"
              onClick={actions.toggle}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 text-white" aria-hidden="true" />
              ) : (
                <Play className="h-6 w-6 text-white" aria-hidden="true" />
              )}
            </button>

            <div
              role="group"
              aria-label="Playback speed"
              className="flex items-center justify-center gap-2"
            >
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => actions.setSpeed(speed)}
                  aria-pressed={state.playbackSpeed === speed}
                  className={cn(
                    'inline-flex min-h-[44px] min-w-[56px] items-center justify-center rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                    state.playbackSpeed === speed
                      ? 'bg-white/15 text-white'
                      : 'bg-white/[0.06] text-white/80 hover:bg-white/10',
                  )}
                >
                  {speed}×
                </button>
              ))}
            </div>
          </div>

          {/* BB-29 — Continuous playback toggle */}
          <div className="mt-2 px-0">
            <ToggleSwitch
              id="bb29-continuous-playback"
              checked={state.continuousPlayback}
              onChange={actions.setContinuousPlayback}
              label="Continuous playback"
              description="Auto-play next chapter"
            />
          </div>

          {/* BB-44 — Read-along verse highlighting toggle */}
          <div className="mt-1 px-0">
            <ToggleSwitch
              id="bb44-read-along"
              checked={state.readAlongEnabled}
              onChange={actions.setReadAlong}
              label="Read along"
              description="Highlight verses as you listen"
            />
          </div>
        </>
      )}

      <AttributionFooter />
      <SleepTimerPanel isOpen={sleepTimerOpen} onClose={() => setSleepTimerOpen(false)} />
    </div>
  )
}
