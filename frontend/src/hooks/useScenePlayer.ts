import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import {
  useAudioState,
  useAudioDispatch,
  useAudioEngine,
} from '@/components/audio/AudioProvider'
import { AUDIO_BASE_URL } from '@/constants/audio'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import type { ScenePreset } from '@/types/music'
import type { ActiveSound } from '@/types/audio'

const SCENE_STAGGER_MS = 200
const UNDO_WINDOW_MS = 5000

interface PreviousMix {
  sounds: ActiveSound[]
  sceneId: string | null
  sceneName: string | null
}

export interface PendingRoutineInterrupt {
  scene: ScenePreset
}

export interface UseScenePlayerReturn {
  activeSceneId: string | null
  loadScene: (scene: ScenePreset) => void
  isLoading: boolean
  undoAvailable: boolean
  undoSceneSwitch: () => void
  pendingRoutineInterrupt: PendingRoutineInterrupt | null
  confirmRoutineInterrupt: () => void
  cancelRoutineInterrupt: () => void
}

export function useScenePlayer(): UseScenePlayerReturn {
  const { isLoggedIn } = useAuth()
  const authModal = useAuthModal()
  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()

  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [pendingRoutineInterrupt, setPendingRoutineInterrupt] =
    useState<PendingRoutineInterrupt | null>(null)

  const previousMixRef = useRef<PreviousMix | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Clean up undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
    }
  }, [])

  // Shared scene-loading logic used by both loadScene and confirmRoutineInterrupt
  const executeSceneLoad = useCallback(
    (scene: ScenePreset) => {
      // If same scene is already active, toggle play/pause
      if (activeSceneId === scene.id) {
        dispatch({ type: audioState.isPlaying ? 'PAUSE_ALL' : 'PLAY_ALL' })
        return
      }

      // If audio is currently playing, store previous mix for undo
      const hasActiveSounds = audioState.activeSounds.length > 0
      if (hasActiveSounds) {
        previousMixRef.current = {
          sounds: [...audioState.activeSounds],
          sceneId: activeSceneId,
          sceneName: audioState.currentSceneName,
        }

        // Stop foreground content cleanly (no crossfade for spoken content)
        if (audioState.foregroundContent) {
          dispatch({ type: 'PAUSE_FOREGROUND' })
        }

        // Remove each current sound individually (not STOP_ALL)
        for (const sound of audioState.activeSounds) {
          dispatch({ type: 'REMOVE_SOUND', payload: { soundId: sound.soundId } })
        }
      }

      // Load scene sounds with staggered fade-in
      setIsLoading(true)
      setActiveSceneId(scene.id)
      dispatch({ type: 'SET_SCENE_NAME', payload: { sceneName: scene.name, sceneId: scene.id } })

      const loadPromises = scene.sounds.map((sceneSound, index) => {
        const catalogSound = SOUND_BY_ID.get(sceneSound.soundId)
        if (!catalogSound) return Promise.resolve()

        return new Promise<void>((resolve) => {
          setTimeout(async () => {
            const url = AUDIO_BASE_URL + catalogSound.filename

            try {
              await engine?.addSound(sceneSound.soundId, url, sceneSound.volume)
              dispatch({
                type: 'ADD_SOUND',
                payload: {
                  soundId: sceneSound.soundId,
                  volume: sceneSound.volume,
                  label: catalogSound.name,
                  url,
                },
              })
            } catch {
              // Non-fatal: individual sound load failure in a scene
            }
            resolve()
          }, index * SCENE_STAGGER_MS)
        })
      })

      Promise.all(loadPromises)
        .then(() => {
          setIsLoading(false)
        })
        .catch(() => {
          setIsLoading(false)
        })

      // If switching (had previous sounds), set up undo window
      if (hasActiveSounds) {
        if (undoTimerRef.current) {
          clearTimeout(undoTimerRef.current)
        }
        setUndoAvailable(true)
        undoTimerRef.current = setTimeout(() => {
          setUndoAvailable(false)
          previousMixRef.current = null
        }, UNDO_WINDOW_MS)
      }
    },
    [
      activeSceneId,
      audioState.activeSounds,
      audioState.isPlaying,
      audioState.currentSceneName,
      audioState.foregroundContent,
      dispatch,
      engine,
    ],
  )

  const loadScene = useCallback(
    (scene: ScenePreset) => {
      if (!isLoggedIn) {
        authModal?.openAuthModal('Sign in to play ambient scenes')
        return
      }

      if (audioState.activeRoutine) {
        setPendingRoutineInterrupt({ scene })
        return
      }

      executeSceneLoad(scene)
    },
    [isLoggedIn, authModal, audioState.activeRoutine, executeSceneLoad],
  )

  const confirmRoutineInterrupt = useCallback(() => {
    if (!pendingRoutineInterrupt) return
    dispatch({ type: 'END_ROUTINE' })
    const { scene } = pendingRoutineInterrupt
    setPendingRoutineInterrupt(null)
    executeSceneLoad(scene)
  }, [pendingRoutineInterrupt, dispatch, executeSceneLoad])

  const cancelRoutineInterrupt = useCallback(() => {
    setPendingRoutineInterrupt(null)
  }, [])

  const undoSceneSwitch = useCallback(() => {
    const prev = previousMixRef.current
    if (!prev) return

    // Clear undo timer
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
    }
    setUndoAvailable(false)

    // Remove current scene sounds
    for (const sound of audioState.activeSounds) {
      dispatch({ type: 'REMOVE_SOUND', payload: { soundId: sound.soundId } })
    }

    // Restore previous sounds
    for (const sound of prev.sounds) {
      const catalogSound = SOUND_BY_ID.get(sound.soundId)
      if (!catalogSound) continue

      const url = AUDIO_BASE_URL + catalogSound.filename
      engine?.addSound(sound.soundId, url, sound.volume)
      dispatch({
        type: 'ADD_SOUND',
        payload: {
          soundId: sound.soundId,
          volume: sound.volume,
          label: sound.label,
          url,
        },
      })
    }

    // Restore previous scene name (or null for manual mix)
    dispatch({
      type: 'SET_SCENE_NAME',
      payload: { sceneName: prev.sceneName, sceneId: prev.sceneId },
    })
    setActiveSceneId(prev.sceneId)

    previousMixRef.current = null
  }, [audioState.activeSounds, dispatch, engine])

  return {
    activeSceneId,
    loadScene,
    isLoading,
    undoAvailable,
    undoSceneSwitch,
    pendingRoutineInterrupt,
    confirmRoutineInterrupt,
    cancelRoutineInterrupt,
  }
}
