import { Play, Pause } from 'lucide-react'
import { useAudioState, useAudioDispatch } from './AudioProvider'
import { VolumeSlider } from './VolumeSlider'
import { ForegroundProgressBar } from './ForegroundProgressBar'

export function DrawerNowPlaying() {
  const state = useAudioState()
  const dispatch = useAudioDispatch()

  return (
    <div className="space-y-4 px-4 pb-4 pt-2">
      {/* Artwork placeholder */}
      <div
        className="mx-auto aspect-square w-full max-w-[200px] rounded-xl bg-gradient-to-br from-hero-mid to-primary/30 motion-safe:animate-artwork-drift"
        style={{ backgroundSize: '120% 120%' }}
        aria-hidden="true"
      />

      {/* Play/Pause */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() =>
            dispatch({ type: state.isPlaying ? 'PAUSE_ALL' : 'PLAY_ALL' })
          }
          aria-label={state.isPlaying ? 'Pause all audio' : 'Resume all audio'}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
        >
          {state.isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
      </div>

      {/* Master Volume */}
      <VolumeSlider
        value={Math.round(state.masterVolume * 100)}
        onChange={(v) =>
          dispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: v / 100 } })
        }
        label="Volume"
        ariaLabel={`Master volume, ${Math.round(state.masterVolume * 100)}%`}
      />

      {/* Foreground progress (conditional) */}
      <ForegroundProgressBar />

      {/* Balance slider (conditional) */}
      {state.activeSounds.length > 0 && state.foregroundContent && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/50">
            <span>Voice</span>
            <span>Ambient</span>
          </div>
          <VolumeSlider
            value={Math.round(state.foregroundBackgroundBalance * 100)}
            onChange={(v) =>
              dispatch({
                type: 'SET_FOREGROUND_BACKGROUND_BALANCE',
                payload: { balance: v / 100 },
              })
            }
            label=""
            ariaLabel={`Foreground background balance, ${Math.round(state.foregroundBackgroundBalance * 100)}%`}
          />
        </div>
      )}
    </div>
  )
}
