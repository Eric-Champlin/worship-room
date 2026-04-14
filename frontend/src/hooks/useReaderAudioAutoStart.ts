import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAudioState, useAudioDispatch, useAudioEngine, useReadingContext } from '@/components/audio/AudioProvider'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import { AUDIO_CONFIG, AUDIO_BASE_URL } from '@/constants/audio'
import { storageService } from '@/services/storage-service'

interface UseReaderAudioAutoStartOptions {
  enabled: boolean
  preferredSoundId: string | null
  volume: number // 0-100
  bookName: string
  chapter: number
  isReady: boolean
}

export function useReaderAudioAutoStart({
  enabled,
  preferredSoundId,
  volume,
  bookName,
  chapter,
  isReady,
}: UseReaderAudioAutoStartOptions): void {
  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()
  const readingContextControl = useReadingContext()
  const { isAuthenticated } = useAuth()
  const hasAutoStarted = useRef(false)

  // Reset auto-start flag on chapter change
  useEffect(() => {
    hasAutoStarted.current = false
  }, [bookName, chapter])

  useEffect(() => {
    if (!enabled || !isReady || !isAuthenticated) return
    if (hasAutoStarted.current) return
    // Don't auto-start if audio is already playing
    if (audioState.isPlaying || audioState.activeSounds.length > 0) return

    hasAutoStarted.current = true

    // Resolve sound ID
    let soundId = preferredSoundId
    if (!soundId || !SOUND_BY_ID.has(soundId)) {
      // Fall through to last-played
      const history = storageService.getListeningHistory()
      const lastAmbient = history.find((s) => s.contentType === 'ambient')
      soundId = lastAmbient?.contentId ?? null
    }

    // Validate sound still exists in catalog
    if (!soundId || !SOUND_BY_ID.has(soundId)) return // silent failure

    const sound = SOUND_BY_ID.get(soundId)!

    // Set reader-context volume
    dispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: volume / 100 } })

    // Start the sound
    const url = `${AUDIO_BASE_URL}ambient/${sound.filename}`
    engine?.ensureContext()
    engine?.addSound(sound.id, url, AUDIO_CONFIG.DEFAULT_SOUND_VOLUME)
    dispatch({
      type: 'ADD_SOUND',
      payload: { soundId: sound.id, volume: AUDIO_CONFIG.DEFAULT_SOUND_VOLUME, label: sound.name, url },
    })

    // Set reading context for media session
    readingContextControl.setReadingContext({ book: bookName, chapter })
  }, [enabled, isReady, isAuthenticated, bookName, chapter]) // eslint-disable-line react-hooks/exhaustive-deps
}
