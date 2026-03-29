import { useCallback } from 'react'
import { useAudioEngine } from '@/components/audio/AudioProvider'
import { playSound } from '@/lib/sound-effects'
import type { SoundEffectId } from '@/lib/sound-effects'

const STORAGE_KEY = 'wr_sound_effects_enabled'

function isSoundEffectsEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    return val !== 'false' // default true when not set
  } catch (_e) {
    // localStorage may be unavailable
    return false
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (_e) {
    // matchMedia may not be available in some environments
    return false
  }
}

export function useSoundEffects(): { playSoundEffect: (soundId: SoundEffectId) => void } {
  const engine = useAudioEngine()

  const playSoundEffect = useCallback(
    (soundId: SoundEffectId) => {
      if (!isSoundEffectsEnabled()) return
      if (prefersReducedMotion()) return
      if (!engine) return

      try {
        const ctx = engine.ensureContext()
        playSound(ctx, soundId)
      } catch (_e) {
        // Audio API may not be available
      }
    },
    [engine],
  )

  return { playSoundEffect }
}
