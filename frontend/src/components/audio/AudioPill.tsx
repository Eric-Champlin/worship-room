import { Play, Pause } from 'lucide-react'
import { useAudioState, useAudioDispatch } from './AudioProvider'
import { WaveformBars } from './WaveformBars'
import { ProgressArc } from './ProgressArc'

export function AudioPill() {
  const state = useAudioState()
  const dispatch = useAudioDispatch()

  if (!state.pillVisible) return null

  const foregroundProgress =
    state.foregroundContent && state.foregroundContent.duration > 0
      ? state.foregroundContent.playbackPosition / state.foregroundContent.duration
      : 0

  function handlePlayPause(e: React.MouseEvent) {
    e.stopPropagation()
    dispatch({ type: state.isPlaying ? 'PAUSE_ALL' : 'PLAY_ALL' })
  }

  function handlePillClick() {
    dispatch({ type: 'OPEN_DRAWER' })
  }

  return (
    <div
      role="complementary"
      aria-label="Audio player controls"
      className="fixed z-[9999] flex h-14 min-w-[44px] cursor-pointer items-center gap-3 rounded-full border border-primary/40 px-4 transition-opacity duration-300 bottom-0 left-1/2 -translate-x-1/2 mb-[max(24px,calc(env(safe-area-inset-bottom)+8px))] lg:left-auto lg:right-6 lg:bottom-6 lg:translate-x-0 lg:mb-0"
      style={{
        background: 'rgba(15, 10, 30, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={handlePillClick}
    >
      <ProgressArc progress={foregroundProgress} />

      <button
        type="button"
        onClick={handlePlayPause}
        aria-label={state.isPlaying ? 'Pause all audio' : 'Resume all audio'}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
      >
        {state.isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>

      <WaveformBars isPlaying={state.isPlaying} />

      {(state.foregroundContent?.title ?? state.currentSceneName) && (
        <span className="max-w-[150px] truncate text-sm font-medium text-white">
          {state.foregroundContent?.title ?? state.currentSceneName}
        </span>
      )}
    </div>
  )
}
