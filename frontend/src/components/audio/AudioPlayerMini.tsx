/**
 * BB-26 — AudioPlayerMini
 *
 * Minimized 64px bar: chapter reference + play/pause. Tapping the left
 * area expands the sheet to full player. The mini bar does NOT include
 * a close button — the user must expand first to close.
 */

import { useState } from 'react'
import { Play, Pause, ChevronUp, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'
import { SleepTimerPanel } from '@/components/bible/SleepTimerPanel'
import { formatSleepTimerRemaining } from '@/lib/audio/sleep-timer'

export function AudioPlayerMini() {
  const { state, actions } = useAudioPlayer()
  const [sleepTimerOpen, setSleepTimerOpen] = useState(false)

  if (!state.track) return null

  const isPlaying = state.playbackState === 'playing'
  const Icon = isPlaying ? Pause : Play
  const toggleLabel = isPlaying ? 'Pause audio' : 'Resume audio'
  const hasSleepTimer = state.sleepTimer !== null || state.sleepFade !== null

  let indicatorText = ''
  let indicatorAriaLabel = ''
  if (state.sleepFade) {
    indicatorText = 'Fading...'
    indicatorAriaLabel = 'Sleep timer: fading out'
  } else if (state.sleepTimer?.type === 'end-of-chapter') {
    indicatorText = 'Ends with chapter'
    indicatorAriaLabel = 'Sleep timer: ends with chapter'
  } else if (state.sleepTimer?.type === 'end-of-book') {
    indicatorText = 'Ends with book'
    indicatorAriaLabel = 'Sleep timer: ends with book'
  } else if (state.sleepTimer) {
    indicatorText = formatSleepTimerRemaining(state.sleepTimer.remainingMs)
    const totalSeconds = Math.ceil(state.sleepTimer.remainingMs / 1000)
    const minutes = Math.ceil(totalSeconds / 60)
    indicatorAriaLabel = `Sleep timer: ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`
  }

  return (
    <>
      <div className="flex h-16 items-center justify-between gap-3 px-6 py-3">
        <button
          type="button"
          onClick={actions.expand}
          aria-label="Expand audio player"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <ChevronUp className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
          <span className="truncate text-sm text-white/80">
            {state.track.bookDisplayName} {state.track.chapter}
          </span>
        </button>
        {hasSleepTimer && (
          <button
            type="button"
            onClick={() => setSleepTimerOpen(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-white/[0.06] px-1.5 py-0.5"
            aria-live="polite"
            aria-label={indicatorAriaLabel}
          >
            <Moon className="h-2.5 w-2.5 text-primary/80" aria-hidden="true" />
            <span className="text-[10px] tabular-nums text-white/70">{indicatorText}</span>
          </button>
        )}
        {/* BB-28 moon button */}
        <button
          type="button"
          onClick={() => setSleepTimerOpen(true)}
          aria-label={hasSleepTimer ? 'Sleep timer active — open settings' : 'Set sleep timer'}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
        >
          <Moon
            className={cn('h-4 w-4', hasSleepTimer ? 'text-primary/80' : 'text-white/50')}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          onClick={actions.toggle}
          aria-label={toggleLabel}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <Icon className="h-4 w-4 text-white" aria-hidden="true" />
        </button>
      </div>
      <SleepTimerPanel isOpen={sleepTimerOpen} onClose={() => setSleepTimerOpen(false)} />
    </>
  )
}
