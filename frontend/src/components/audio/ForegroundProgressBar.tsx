import { useAudioState, useAudioDispatch } from './AudioProvider'

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60)
  const s = Math.floor(Math.abs(seconds) % 60)
  const sign = seconds < 0 ? '-' : ''
  return `${sign}${m}:${String(s).padStart(2, '0')}`
}

export function ForegroundProgressBar() {
  const state = useAudioState()
  const dispatch = useAudioDispatch()

  if (!state.foregroundContent) return null

  const { playbackPosition, duration, title } = state.foregroundContent
  const remaining = -(duration - playbackPosition)

  return (
    <div className="w-full space-y-1">
      <input
        type="range"
        min={0}
        max={duration}
        step={0.1}
        value={playbackPosition}
        onChange={(e) =>
          dispatch({
            type: 'SEEK_FOREGROUND',
            payload: { position: Number(e.target.value) },
          })
        }
        aria-label={`${title} playback progress`}
        aria-valuetext={`${formatTime(playbackPosition)} of ${formatTime(duration)}`}
        className="audio-slider h-1 min-h-[44px] w-full cursor-pointer appearance-none rounded-full"
        style={{
          background:
            duration > 0
              ? `linear-gradient(to right, #6D28D9 0%, #6D28D9 ${(playbackPosition / duration) * 100}%, #374151 ${(playbackPosition / duration) * 100}%, #374151 100%)`
              : '#374151',
        }}
      />
      <div className="flex justify-between text-xs tabular-nums text-white/60">
        <span>{formatTime(playbackPosition)}</span>
        <span>{formatTime(remaining)}</span>
      </div>
      <p className="truncate text-xs text-white/70">{title}</p>
    </div>
  )
}
