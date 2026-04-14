import { Music } from 'lucide-react'
import { useAudioState, useAudioDispatch } from '@/components/audio/AudioProvider'
import { cn } from '@/lib/utils'
import type { AmbientContext } from '@/constants/ambient-suggestions'

interface AmbientSoundPillProps {
  context: AmbientContext
  variant?: 'light' | 'dark'
  visible?: boolean
  className?: string
}

export function AmbientSoundPill({
  context: _context,
  variant = 'light',
  visible = true,
  className,
}: AmbientSoundPillProps) {
  const audioState = useAudioState()
  const dispatch = useAudioDispatch()

  const hasActiveAudio = audioState.activeSounds.length > 0 || audioState.pillVisible

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!visible) return null

  const handlePillClick = () => {
    dispatch({ type: audioState.drawerOpen ? 'CLOSE_DRAWER' : 'OPEN_DRAWER' })
  }

  const playingLabel = audioState.currentSceneName
    ? `Playing: ${audioState.currentSceneName}`
    : 'Playing: Custom mix'

  const pillAriaLabel = hasActiveAudio
    ? `${playingLabel}, click to open audio controls`
    : 'Enhance with sound'

  const isLight = variant === 'light'

  return (
    <div className={cn('mb-4', className)}>
      {/* Pill button */}
      <button
        type="button"
        onClick={handlePillClick}
        aria-label={pillAriaLabel}
        className={
          hasActiveAudio
            ? `inline-flex w-full min-h-[44px] items-center gap-2 rounded-full border py-2 px-4 text-sm transition-[colors,transform] duration-fast active:scale-[0.98] sm:w-auto ${
                isLight
                  ? 'border-gray-200/50 border-l-2 border-l-primary bg-gray-100/80 backdrop-blur-md hover:bg-gray-200/80'
                  : 'border-white/20 border-l-2 border-l-primary bg-white/10 backdrop-blur-md hover:bg-white/20'
              }`
            : `inline-flex w-full min-h-[44px] items-center gap-2 rounded-full border py-2 px-4 text-sm transition-[colors,transform] duration-fast active:scale-[0.98] sm:w-auto ${
                isLight
                  ? 'border-gray-200/50 bg-gray-100/80 backdrop-blur-md hover:bg-gray-200/80'
                  : 'border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20'
              }`
        }
      >
        {hasActiveAudio ? (
          <>
            {/* Waveform bars */}
            <span className="flex items-end gap-[2px]" aria-hidden="true">
              <span
                className={`w-[3px] rounded-full bg-primary ${
                  reducedMotion ? 'h-[10px]' : 'h-[4px] animate-waveform-bar-1'
                }`}
              />
              <span
                className={`w-[3px] rounded-full bg-primary ${
                  reducedMotion ? 'h-[14px]' : 'h-[8px] animate-waveform-bar-2'
                }`}
              />
              <span
                className={`w-[3px] rounded-full bg-primary ${
                  reducedMotion ? 'h-[8px]' : 'h-[6px] animate-waveform-bar-3'
                }`}
              />
            </span>
            <span
              className={`font-medium ${isLight ? 'text-gray-600' : 'text-white/80'}`}
            >
              {playingLabel}
            </span>
          </>
        ) : (
          <>
            <Music
              className={`h-4 w-4 ${isLight ? 'text-gray-500' : 'text-white/60'}`}
              aria-hidden="true"
            />
            <span className={isLight ? 'text-gray-600' : 'text-white/70'}>
              Enhance with sound
            </span>
          </>
        )}
      </button>
    </div>
  )
}
