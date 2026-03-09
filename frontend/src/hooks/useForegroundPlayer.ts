import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import {
  useAudioState,
  useAudioDispatch,
  useAudioEngine,
} from '@/components/audio/AudioProvider'
import { AUDIO_BASE_URL } from '@/constants/audio'
import type { ScriptureReading, BedtimeStory } from '@/types/music'

const CROSSFADE_OUT_MS = 2000

export interface PendingSwitch {
  currentTitle: string
  remainingTime: number
  newTitle: string
  newContent: ScriptureReading | BedtimeStory
}

export interface UseForegroundPlayerReturn {
  startSession: (content: ScriptureReading | BedtimeStory) => void
  pendingSwitch: PendingSwitch | null
  confirmSwitch: () => void
  cancelSwitch: () => void
}

function isScriptureReading(
  content: ScriptureReading | BedtimeStory,
): content is ScriptureReading {
  return 'scriptureReference' in content
}

export function useForegroundPlayer(): UseForegroundPlayerReturn {
  const { isLoggedIn } = useAuth()
  const authModal = useAuthModal()
  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()

  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(null)
  const listenerCleanupRef = useRef<(() => void) | null>(null)

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      listenerCleanupRef.current?.()
    }
  }, [])

  const setupAudioListeners = useCallback(
    (audioElement: HTMLAudioElement) => {
      // Remove old listeners
      listenerCleanupRef.current?.()

      const onTimeUpdate = () => {
        dispatch({
          type: 'UPDATE_FOREGROUND_POSITION',
          payload: { position: audioElement.currentTime },
        })
      }

      const onEnded = () => {
        dispatch({ type: 'PAUSE_FOREGROUND' })
      }

      audioElement.addEventListener('timeupdate', onTimeUpdate)
      audioElement.addEventListener('ended', onEnded)

      listenerCleanupRef.current = () => {
        audioElement.removeEventListener('timeupdate', onTimeUpdate)
        audioElement.removeEventListener('ended', onEnded)
      }
    },
    [dispatch],
  )

  const playContent = useCallback(
    (content: ScriptureReading | BedtimeStory) => {
      if (!engine) return

      const isScripture = isScriptureReading(content)
      const url = AUDIO_BASE_URL + content.audioFilename

      const audioElement = engine.playForeground(url)
      setupAudioListeners(audioElement)

      dispatch({
        type: 'START_FOREGROUND',
        payload: {
          contentId: content.id,
          contentType: isScripture ? 'scripture' : 'story',
          title: content.title,
          duration: content.durationSeconds,
          scriptureReference: isScripture ? content.scriptureReference : undefined,
          voiceGender: content.voiceId,
          webText: isScripture ? content.webText : undefined,
        },
      })
    },
    [engine, dispatch, setupAudioListeners],
  )

  const startSession = useCallback(
    (content: ScriptureReading | BedtimeStory) => {
      // 1. Auth gate
      if (!isLoggedIn) {
        authModal?.openAuthModal('Sign in to listen to sleep content')
        return
      }

      // 2. If foreground is already playing, show confirmation
      if (audioState.foregroundContent) {
        const remaining =
          audioState.foregroundContent.duration -
          audioState.foregroundContent.playbackPosition
        setPendingSwitch({
          currentTitle: audioState.foregroundContent.title,
          remainingTime: Math.max(0, remaining),
          newTitle: content.title,
          newContent: content,
        })
        return
      }

      // 3. No existing foreground — play directly
      playContent(content)
    },
    [isLoggedIn, authModal, audioState.foregroundContent, playContent],
  )

  const confirmSwitch = useCallback(() => {
    if (!pendingSwitch || !engine) return

    const audioElement = engine.getForegroundElement()

    if (audioElement) {
      // Crossfade out over 2 seconds, then start new content
      engine.crossfadeOutForeground(CROSSFADE_OUT_MS)

      setTimeout(() => {
        playContent(pendingSwitch.newContent)
      }, CROSSFADE_OUT_MS)
    } else {
      playContent(pendingSwitch.newContent)
    }

    setPendingSwitch(null)
  }, [pendingSwitch, engine, playContent])

  const cancelSwitch = useCallback(() => {
    setPendingSwitch(null)
  }, [])

  return {
    startSession,
    pendingSwitch,
    confirmSwitch,
    cancelSwitch,
  }
}
