import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useAudioState,
  useAudioDispatch,
} from '@/components/audio/AudioProvider'
import { useToast } from '@/components/ui/Toast'

function isPlayEvent(data: unknown): boolean {
  return (
    data !== null &&
    typeof data === 'object' &&
    ('type' in data || 'playback_update' in data)
  )
}

export function useSpotifyAutoPause() {
  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const { showToast } = useToast()

  const [spotifyDetected, setSpotifyDetected] = useState(false)
  const [manualPauseEnabled, setManualPauseEnabled] = useState(true)
  const originalVolumeRef = useRef(audioState.masterVolume)
  const fadeFrameRef = useRef<number | null>(null)

  const handleSpotifyPlay = useCallback(() => {
    if (audioState.activeSounds.length === 0) return

    originalVolumeRef.current = audioState.masterVolume

    // Fade master volume to 0 over 2 seconds
    const startVolume = audioState.masterVolume
    const duration = 2000
    const startTime = performance.now()

    function fadeStep(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const volume = startVolume * (1 - progress)
      dispatch({ type: 'SET_MASTER_VOLUME', payload: { volume } })

      if (progress < 1) {
        fadeFrameRef.current = requestAnimationFrame(fadeStep)
      } else {
        dispatch({ type: 'PAUSE_ALL' })
        showToast('Ambient paused. Tap pill to resume after playlist.')
      }
    }

    fadeFrameRef.current = requestAnimationFrame(fadeStep)
  }, [audioState.activeSounds.length, audioState.masterVolume, dispatch, showToast])

  // Keep a ref to the latest callback so the message listener never goes stale
  const handleSpotifyPlayRef = useRef(handleSpotifyPlay)
  useEffect(() => {
    handleSpotifyPlayRef.current = handleSpotifyPlay
  })

  // Listen for Spotify postMessage events
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== 'https://open.spotify.com') return
      setSpotifyDetected(true)

      // Parse string payloads (Spotify may post JSON strings)
      let data: unknown = event.data
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch {
          return
        }
      }

      if (isPlayEvent(data)) {
        handleSpotifyPlayRef.current()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Manual pause trigger (for when postMessage detection doesn't work)
  const handleManualPause = useCallback(() => {
    if (!manualPauseEnabled) return
    handleSpotifyPlay()
  }, [manualPauseEnabled, handleSpotifyPlay])

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (fadeFrameRef.current) cancelAnimationFrame(fadeFrameRef.current)
    }
  }, [])

  return {
    manualPauseEnabled,
    setManualPauseEnabled,
    spotifyDetected,
    handleManualPause,
  }
}
