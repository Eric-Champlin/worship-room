import { useCallback, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import { useAudioState, useAudioDispatch, useAudioEngine } from '@/components/audio/AudioProvider'
import { AUDIO_CONFIG, AUDIO_BASE_URL } from '@/constants/audio'
import type { Sound } from '@/types/music'

type SoundStatus = 'loading' | 'error'

export interface UseSoundToggleReturn {
  loadingSoundIds: Set<string>
  errorSoundIds: Set<string>
  toggleSound: (sound: Sound) => void
}

export function useSoundToggle(): UseSoundToggleReturn {
  const { isLoggedIn } = useAuth()
  const authModal = useAuthModal()
  const { showToast } = useToast()
  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()

  // Map<soundId, status> — drives the derived Sets
  const [statusMap, setStatusMap] = useState<Map<string, SoundStatus>>(new Map())

  // Prevent double-tap race conditions
  const pendingRef = useRef<Set<string>>(new Set())

  const loadingSoundIds = new Set(
    [...statusMap.entries()].filter(([, s]) => s === 'loading').map(([id]) => id),
  )
  const errorSoundIds = new Set(
    [...statusMap.entries()].filter(([, s]) => s === 'error').map(([id]) => id),
  )

  const toggleSound = useCallback(
    (sound: Sound) => {
      // 1. Auth gate
      if (!isLoggedIn) {
        authModal?.openAuthModal('Sign in to play ambient sounds')
        return
      }

      const isActive = audioState.activeSounds.some((s) => s.soundId === sound.id)

      // 2. Remove if active
      if (isActive) {
        dispatch({ type: 'REMOVE_SOUND', payload: { soundId: sound.id } })
        return
      }

      // 3. Prevent double-tap
      if (pendingRef.current.has(sound.id)) return

      // 4. Clear error if retrying
      setStatusMap((prev) => {
        if (prev.get(sound.id) === 'error') {
          const next = new Map(prev)
          next.delete(sound.id)
          return next
        }
        return prev
      })

      // 5. Check 6-sound limit
      if (audioState.activeSounds.length >= AUDIO_CONFIG.MAX_SIMULTANEOUS_SOUNDS) {
        showToast('Your mix has 6 sounds — remove one to add another.', 'error')
        return
      }

      // 6. Load the sound
      pendingRef.current.add(sound.id)

      // Only show loading spinner if buffer is NOT cached (cached loads are instant)
      const isCached = engine?.isBufferCached(sound.id) ?? false
      if (!isCached) {
        setStatusMap((prev) => new Map(prev).set(sound.id, 'loading'))
      }

      const url = AUDIO_BASE_URL + sound.filename

      loadWithRetry(sound, url)
        .then(() => {
          // Success: dispatch to reducer, clear loading state
          dispatch({
            type: 'ADD_SOUND',
            payload: {
              soundId: sound.id,
              volume: AUDIO_CONFIG.DEFAULT_SOUND_VOLUME,
              label: sound.name,
              url,
            },
          })
          setStatusMap((prev) => {
            const next = new Map(prev)
            next.delete(sound.id)
            return next
          })
        })
        .catch(() => {
          // Failure after all retries
          setStatusMap((prev) => new Map(prev).set(sound.id, 'error'))
          showToast(`Couldn't load ${sound.name} — tap to retry`, 'error')
        })
        .finally(() => {
          pendingRef.current.delete(sound.id)
        })
    },
    [isLoggedIn, authModal, audioState.activeSounds, dispatch, engine, showToast],
  )

  async function loadWithRetry(sound: Sound, url: string): Promise<void> {
    const delays = AUDIO_CONFIG.LOAD_RETRY_DELAYS_MS
    for (let attempt = 0; attempt <= AUDIO_CONFIG.LOAD_RETRY_MAX; attempt++) {
      try {
        await engine!.addSound(sound.id, url, AUDIO_CONFIG.DEFAULT_SOUND_VOLUME)
        return
      } catch {
        if (attempt < AUDIO_CONFIG.LOAD_RETRY_MAX) {
          await new Promise<void>((r) => setTimeout(r, delays[attempt]))
        }
      }
    }
    throw new Error(`Failed to load ${sound.name}`)
  }

  return { loadingSoundIds, errorSoundIds, toggleSound }
}
