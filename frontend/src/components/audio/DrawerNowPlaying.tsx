import { useState } from 'react'
import { Play, Pause, BookOpen } from 'lucide-react'
import { useAudioState, useAudioDispatch } from './AudioProvider'
import { VolumeSlider } from './VolumeSlider'
import { ForegroundProgressBar } from './ForegroundProgressBar'
import { ScriptureTextPanel } from './ScriptureTextPanel'
import { SaveMixButton } from './SaveMixButton'
import { SCENE_PRESETS } from '@/data/scenes'
import { cn } from '@/lib/utils'

const ANIMATION_CLASS: Record<string, string> = {
  drift: 'motion-safe:animate-artwork-drift',
  pulse: 'motion-safe:animate-scene-pulse',
  glow: 'motion-safe:animate-scene-glow',
}

export function DrawerNowPlaying() {
  const state = useAudioState()
  const dispatch = useAudioDispatch()
  const [isTextOpen, setIsTextOpen] = useState(false)

  const activeScene = state.currentSceneName
    ? SCENE_PRESETS.find((s) => s.name === state.currentSceneName) ?? null
    : null

  return (
    <div className="space-y-4 px-4 pb-4 pt-2">
      {/* Artwork */}
      {activeScene ? (
        <div
          className="relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-xl"
          aria-hidden="true"
        >
          <img
            src={`/audio/artwork/${activeScene.artworkFilename}`}
            alt=""
            className={cn(
              'h-full w-full object-cover',
              ANIMATION_CLASS[activeScene.animationCategory],
            )}
          />
        </div>
      ) : (
        <div
          className="mx-auto aspect-square w-full max-w-[200px] rounded-xl bg-gradient-to-br from-hero-mid to-primary/30 motion-safe:animate-artwork-drift"
          style={{ backgroundSize: '120% 120%' }}
          aria-hidden="true"
        />
      )}

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

      {/* Save Mix */}
      <SaveMixButton />

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

      {/* Voice indicator + Scripture text toggle */}
      {state.foregroundContent && (
        <div className="flex items-center gap-2">
          {state.foregroundContent.voiceGender && (
            <span className="text-xs text-white/50">
              {state.foregroundContent.voiceGender === 'male' ? 'Male' : 'Female'} voice
            </span>
          )}
          {state.foregroundContent.contentType === 'scripture' &&
            state.foregroundContent.webText && (
              <button
                type="button"
                onClick={() => setIsTextOpen((prev) => !prev)}
                aria-expanded={isTextOpen}
                aria-controls="scripture-text-panel"
                aria-label={isTextOpen ? 'Hide scripture text' : 'Show scripture text'}
                className={cn(
                  'ml-auto rounded-md p-1.5 transition-colors',
                  isTextOpen
                    ? 'bg-primary/20 text-primary-lt'
                    : 'text-white/50 hover:text-white/80',
                )}
              >
                <BookOpen size={16} />
              </button>
            )}
        </div>
      )}

      {/* Scripture text panel (collapsible) */}
      {isTextOpen &&
        state.foregroundContent?.contentType === 'scripture' &&
        state.foregroundContent.webText && (
          <ScriptureTextPanel
            webText={state.foregroundContent.webText}
            currentPosition={state.foregroundContent.playbackPosition}
            duration={state.foregroundContent.duration}
          />
        )}

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
