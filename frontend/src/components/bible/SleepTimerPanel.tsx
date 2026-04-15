/**
 * BB-28 — Sleep Timer Panel
 *
 * Modal overlay for the Bible audio sleep timer. Renders 8 presets
 * (6 duration + 2 structural), shows the active timer state, and
 * provides a cancel affordance. Portals to document.body for correct
 * z-stacking above the player sheet.
 *
 * Replaces the pre-BB-28 scaffolding that was coupled to the music
 * AudioProvider — this version consumes the Bible audio player context
 * exclusively.
 */

import { createPortal } from 'react-dom'
import { Moon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import {
  formatSleepTimerRemaining,
  SLEEP_TIMER_PRESETS,
  type SleepTimerPreset,
} from '@/lib/audio/sleep-timer'
import type { SleepTimerInfo } from '@/types/bible-audio'

interface SleepTimerPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SleepTimerPanel({ isOpen, onClose }: SleepTimerPanelProps) {
  const { state, actions } = useAudioPlayer()
  const focusTrapRef = useFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  const isAudioActive = state.playbackState === 'playing' || state.playbackState === 'paused'
  const hasActiveTimer = state.sleepTimer !== null || state.sleepFade !== null

  const handlePresetClick = (preset: SleepTimerPreset) => {
    if (!isAudioActive) return
    const timer: SleepTimerInfo = {
      type: preset.type,
      remainingMs: preset.durationMs ?? 0,
      preset: preset.id,
    }
    actions.setSleepTimer(timer)
    onClose()
  }

  const handleCancel = () => {
    actions.cancelSleepTimer()
  }

  // Determine subtitle text
  let subtitle: string
  if (!isAudioActive) {
    subtitle = 'Start audio first, then set a timer'
  } else if (state.sleepFade) {
    subtitle = 'Fading...'
  } else if (state.sleepTimer?.type === 'end-of-chapter') {
    subtitle = 'Ends with chapter'
  } else if (state.sleepTimer?.type === 'end-of-book') {
    subtitle = 'Ends with book'
  } else if (state.sleepTimer) {
    subtitle = `Stopping in ${formatSleepTimerRemaining(state.sleepTimer.remainingMs)}`
  } else {
    subtitle = 'Choose how long to listen'
  }

  const activePresetId = state.sleepTimer?.preset ?? null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sleep-timer-title"
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0D0620]/95 px-6 py-6 backdrop-blur-xl sm:px-8 sm:py-8"
      >
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary/80" aria-hidden="true" />
            <h2
              id="sleep-timer-title"
              className="text-lg font-medium text-white"
            >
              Sleep timer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sleep timer panel"
            className="flex h-[44px] w-[44px] items-center justify-center"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
              <X className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
        </div>

        {/* Subtitle */}
        <p className="mt-1 text-sm text-white/60">{subtitle}</p>

        {/* Preset grid */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SLEEP_TIMER_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                disabled={!isAudioActive}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'min-h-[44px] rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                  !isAudioActive && 'pointer-events-none cursor-not-allowed opacity-50',
                  isSelected
                    ? 'border border-primary/30 bg-white/15 text-white'
                    : 'bg-white/[0.06] text-white/80 hover:bg-white/10',
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {/* Cancel button (when timer active) */}
        {hasActiveTimer && (
          <button
            type="button"
            onClick={handleCancel}
            className="mt-6 w-full min-h-[44px] rounded-full bg-white/[0.06] text-sm text-white/70 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Cancel timer
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
