import { useCallback, useRef } from 'react'
import type { AudioEngineService } from '@/lib/audio-engine'

interface UseAudioDuckingOptions {
  engine: AudioEngineService | null
  activeSoundsCount: number
  masterVolume: number
  sleepTimerPhase: 'full-volume' | 'fading' | 'complete' | null
}

interface UseAudioDuckingReturn {
  duckForVerse: () => void
  unduckForPause: () => void
  unduckImmediate: () => void
  unduckWithRamp: () => void
  isDucked: boolean
}

const DUCK_RATIO = 0.25

export function useAudioDucking({
  engine,
  activeSoundsCount,
  masterVolume,
  sleepTimerPhase,
}: UseAudioDuckingOptions): UseAudioDuckingReturn {
  const isDuckedRef = useRef(false)
  const savedVolumeRef = useRef<number | null>(null)

  const duckForVerse = useCallback(() => {
    if (!engine || activeSoundsCount === 0) return
    if (isDuckedRef.current) return

    // Save current volume for restoration
    const currentVolume = masterVolume
    savedVolumeRef.current = currentVolume

    // If volume is already very low, don't reduce further
    if (currentVolume <= DUCK_RATIO) return

    const targetVolume = currentVolume * DUCK_RATIO
    engine.setMasterVolume(targetVolume)
    isDuckedRef.current = true
  }, [engine, activeSoundsCount, masterVolume])

  const unduckForPause = useCallback(() => {
    if (!engine || !isDuckedRef.current || savedVolumeRef.current === null) return

    // During sleep timer fade, restore to whatever the current fade level is
    // (the sleep timer controls the actual volume reduction)
    engine.setMasterVolume(savedVolumeRef.current)
    isDuckedRef.current = false
    savedVolumeRef.current = null
  }, [engine])

  const unduckImmediate = useCallback(() => {
    if (!engine || !isDuckedRef.current || savedVolumeRef.current === null) return

    // Direct set for user-initiated pause (engine's ramp is 20ms — effectively instant)
    engine.setMasterVolume(savedVolumeRef.current)
    isDuckedRef.current = false
    savedVolumeRef.current = null
  }, [engine])

  const unduckWithRamp = useCallback(() => {
    if (!engine || !isDuckedRef.current || savedVolumeRef.current === null) return

    engine.setMasterVolume(savedVolumeRef.current)
    isDuckedRef.current = false
    savedVolumeRef.current = null
  }, [engine])

  return {
    duckForVerse,
    unduckForPause,
    unduckImmediate,
    unduckWithRamp,
    isDucked: isDuckedRef.current,
  }
}
