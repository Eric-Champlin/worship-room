/**
 * BB-26 — AudioPlayerMini
 *
 * Minimized 64px bar: chapter reference + play/pause. Tapping the left
 * area expands the sheet to full player. The mini bar does NOT include
 * a close button — the user must expand first to close.
 */

import { Play, Pause, ChevronUp } from 'lucide-react'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'

export function AudioPlayerMini() {
  const { state, actions } = useAudioPlayer()
  if (!state.track) return null

  const isPlaying = state.playbackState === 'playing'
  const Icon = isPlaying ? Pause : Play
  const toggleLabel = isPlaying ? 'Pause audio' : 'Resume audio'

  return (
    <div className="flex h-16 items-center justify-between gap-3 px-6 py-3">
      <button
        type="button"
        onClick={actions.expand}
        aria-label="Expand audio player"
        className="flex flex-1 items-center gap-3 rounded-md text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <ChevronUp className="h-4 w-4 text-white/50" aria-hidden="true" />
        <span className="text-sm text-white/80">
          {state.track.bookDisplayName} {state.track.chapter}
        </span>
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
  )
}
