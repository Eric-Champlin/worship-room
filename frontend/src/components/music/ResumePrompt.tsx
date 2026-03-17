import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSessionPersistence } from '@/hooks/useSessionPersistence'
import { useAudioDispatch, useAudioEngine } from '@/components/audio/AudioProvider'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import { AUDIO_BASE_URL } from '@/constants/audio'

const STAGGER_MS = 200

export function ResumePrompt() {
  const { isAuthenticated } = useAuth()
  const { sessionState, hasValidSession, clearSession } = useSessionPersistence()
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()
  const resumeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (hasValidSession) {
      resumeButtonRef.current?.focus()
    }
  }, [hasValidSession])

  if (!isAuthenticated || !hasValidSession || !sessionState) return null

  function handleResume() {
    // Set master volume
    dispatch({
      type: 'SET_MASTER_VOLUME',
      payload: { volume: sessionState!.masterVolume },
    })

    // Stagger-add saved sounds
    sessionState!.activeSounds.forEach((s, index) => {
      const catalogSound = SOUND_BY_ID.get(s.soundId)
      if (!catalogSound) return

      setTimeout(() => {
        const url = AUDIO_BASE_URL + catalogSound.filename
        engine?.addSound(s.soundId, url, s.volume)
        dispatch({
          type: 'ADD_SOUND',
          payload: {
            soundId: s.soundId,
            volume: s.volume,
            label: catalogSound.name,
            url,
          },
        })
      }, index * STAGGER_MS)
    })

    clearSession()
  }

  function handleDismiss() {
    clearSession()
  }

  return (
    <div
      role="alert"
      className="mx-auto max-w-6xl px-4 py-4 sm:px-6"
    >
      <div className="flex flex-col items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-text-dark">
          Welcome back! Resume your last session?
        </p>
        <div className="flex gap-3">
          <button
            ref={resumeButtonRef}
            type="button"
            onClick={handleResume}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-lt"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-2 text-sm text-text-dark/70 transition-colors hover:text-text-dark"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
