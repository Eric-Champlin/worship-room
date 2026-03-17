import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSessionPersistence } from '@/hooks/useSessionPersistence'
import { useAudioState } from './AudioProvider'
import type { AudioState } from '@/types/audio'

const AUTO_SAVE_INTERVAL_MS = 60_000 // 60 seconds

function buildSessionState(state: AudioState) {
  return {
    activeSounds: state.activeSounds.map((s) => ({
      soundId: s.soundId,
      volume: s.volume,
    })),
    foregroundContentId: state.foregroundContent?.contentId ?? null,
    foregroundPosition: state.foregroundContent?.playbackPosition ?? 0,
    masterVolume: state.masterVolume,
    savedAt: new Date().toISOString(),
  }
}

export function SessionAutoSave() {
  const { isAuthenticated } = useAuth()
  const { saveSession } = useSessionPersistence()
  const state = useAudioState()
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  // Keep a ref to latest state so interval/event callbacks always read current values
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  const saveSessionRef = useRef(saveSession)
  useEffect(() => {
    saveSessionRef.current = saveSession
  })

  // Periodic auto-save when playing
  useEffect(() => {
    if (!isAuthenticated || !state.isPlaying) {
      clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      saveSessionRef.current(buildSessionState(stateRef.current))
    }, AUTO_SAVE_INTERVAL_MS)

    return () => clearInterval(intervalRef.current)
  }, [isAuthenticated, state.isPlaying])

  // Save on beforeunload
  useEffect(() => {
    if (!isAuthenticated) return

    function handleBeforeUnload() {
      if (stateRef.current.activeSounds.length > 0) {
        saveSessionRef.current(buildSessionState(stateRef.current))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isAuthenticated])

  // Save on sleep timer complete
  useEffect(() => {
    if (!isAuthenticated) return
    if (state.sleepTimer?.phase === 'complete' && state.activeSounds.length > 0) {
      saveSession(buildSessionState(state))
    }
  }, [isAuthenticated, state.sleepTimer?.phase, state.activeSounds.length, saveSession, state])

  return null
}
