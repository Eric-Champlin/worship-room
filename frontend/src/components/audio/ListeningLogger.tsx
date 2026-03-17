import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useListeningHistory } from '@/hooks/useListeningHistory'
import { useAudioState } from './AudioProvider'

const MIN_SESSION_SECONDS = 5

interface SessionRef {
  startedAt: string
  contentType: 'ambient' | 'scene' | 'scripture' | 'story' | 'routine'
  contentId: string
}

export function ListeningLogger() {
  const { isAuthenticated } = useAuth()
  const { logSession } = useListeningHistory()
  const state = useAudioState()
  const sessionRef = useRef<SessionRef | null>(null)
  const wasPlayingRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) return

    const isPlaying = state.isPlaying

    // Playback just started
    if (isPlaying && !wasPlayingRef.current) {
      // Determine content type and ID
      let contentType: SessionRef['contentType'] = 'ambient'
      let contentId = 'custom-mix'

      if (state.foregroundContent) {
        contentType =
          state.foregroundContent.contentType === 'scripture'
            ? 'scripture'
            : 'story'
        contentId = state.foregroundContent.contentId
      } else if (state.currentSceneId) {
        contentType = 'scene'
        contentId = state.currentSceneId
      } else if (state.activeRoutine) {
        contentType = 'routine'
        contentId = state.activeRoutine.routineId
      }

      sessionRef.current = {
        startedAt: new Date().toISOString(),
        contentType,
        contentId,
      }
    }

    // Playback just stopped
    if (!isPlaying && wasPlayingRef.current && sessionRef.current) {
      const startTime = new Date(sessionRef.current.startedAt).getTime()
      const durationSeconds = Math.round((Date.now() - startTime) / 1000)

      if (durationSeconds >= MIN_SESSION_SECONDS) {
        logSession({
          contentType: sessionRef.current.contentType,
          contentId: sessionRef.current.contentId,
          startedAt: sessionRef.current.startedAt,
          durationSeconds,
          completed: false,
        })
      }

      sessionRef.current = null
    }

    wasPlayingRef.current = isPlaying
  }, [
    isAuthenticated,
    state.isPlaying,
    state.foregroundContent,
    state.currentSceneId,
    state.activeRoutine,
    logSession,
  ])

  return null
}
