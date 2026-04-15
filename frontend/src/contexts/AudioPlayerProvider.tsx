/**
 * BB-26 — AudioPlayerProvider
 *
 * Owns the reducer state, the imperative engine reference, the tick
 * interval, and the action callbacks. Pure types, the reducer, the
 * initial state, and the context object itself live in the sibling
 * `AudioPlayerContext.ts` so this file exports only the provider
 * component (resolves the react-refresh/only-export-components rule).
 *
 * Rapid-navigation supersession:
 *   If the user taps "next chapter" rapidly, multiple play() calls fire.
 *   Each call captures a request id via useRef; calls bail out at every
 *   await point if a later request has taken over. Without this, the
 *   earlier chapter's engine would win the race and play the wrong audio.
 *
 * Error routing:
 *   All error dispatches go through `audioErrorMessageFor()` in
 *   `lib/audio/error-messages.ts` — no hardcoded user-facing strings here.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import type {
  AudioPlayerActions,
  PlaybackSpeed,
  PlayerTrack,
} from '@/types/bible-audio'
import type { AudioEngineInstance } from '@/lib/audio/engine'
import { audioErrorMessageFor } from '@/lib/audio/error-messages'
import {
  clearMediaSession,
  updateMediaSession,
} from '@/lib/audio/media-session'
import { AudioPlayerContext, initialState, reducer } from './AudioPlayerContext'

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const engineRef = useRef<AudioEngineInstance | null>(null)
  const tickIntervalRef = useRef<number | null>(null)
  // Rapid-navigation supersession — each play() call captures the current
  // request id; if a later call increments this ref past the captured id,
  // the earlier call bails out of any async work it's still doing.
  const lastPlayRequestIdRef = useRef(0)

  // We keep `actions` stable using useMemo with useCallback for each method.
  // The actions closure reads from refs (engineRef, lastPlayRequestIdRef), not
  // state, so there's no stale-closure issue.

  const pause = useCallback(() => {
    engineRef.current?.pause()
  }, [])

  const clearTickInterval = useCallback(() => {
    if (tickIntervalRef.current !== null) {
      clearInterval(tickIntervalRef.current)
      tickIntervalRef.current = null
    }
  }, [])

  const startTickInterval = useCallback(() => {
    clearTickInterval()
    tickIntervalRef.current = window.setInterval(() => {
      if (!engineRef.current) return
      dispatch({ type: 'TICK', currentTime: engineRef.current.getCurrentTime() })
    }, 200)
  }, [clearTickInterval])

  const play = useCallback(
    async (track: PlayerTrack): Promise<void> => {
      const myId = ++lastPlayRequestIdRef.current

      // Tear down any existing engine immediately so we don't have two
      // audio streams fighting each other.
      if (engineRef.current) {
        engineRef.current.destroy()
        engineRef.current = null
      }
      clearTickInterval()

      dispatch({ type: 'LOAD_START', track })

      let newEngine: AudioEngineInstance | null = null
      try {
        const { createEngineInstance } = await import('@/lib/audio/engine')

        if (myId !== lastPlayRequestIdRef.current) return

        newEngine = await createEngineInstance(track.url, {
          onPlay: () => {
            if (myId !== lastPlayRequestIdRef.current) return
            dispatch({ type: 'PLAY' })
          },
          onPause: () => {
            if (myId !== lastPlayRequestIdRef.current) return
            dispatch({ type: 'PAUSE' })
          },
          onEnd: () => {
            if (myId !== lastPlayRequestIdRef.current) return
            dispatch({ type: 'STOP' })
          },
          onLoad: (duration) => {
            if (myId !== lastPlayRequestIdRef.current) return
            dispatch({ type: 'LOAD_SUCCESS', duration })
            newEngine?.play()
          },
          onLoadError: (err) => {
            if (myId !== lastPlayRequestIdRef.current) return
            dispatch({ type: 'LOAD_ERROR', message: audioErrorMessageFor(err) })
          },
          onPlayError: (err) => {
            if (myId !== lastPlayRequestIdRef.current) return
            dispatch({ type: 'LOAD_ERROR', message: audioErrorMessageFor(err) })
          },
        })

        if (myId !== lastPlayRequestIdRef.current) {
          newEngine.destroy()
          return
        }

        engineRef.current = newEngine
        startTickInterval()
      } catch (err) {
        if (myId !== lastPlayRequestIdRef.current) {
          newEngine?.destroy()
          return
        }
        dispatch({ type: 'LOAD_ERROR', message: audioErrorMessageFor(err) })
      }
    },
    [clearTickInterval, startTickInterval],
  )

  // Keep a ref mirror of playbackState so `toggle` can read it without
  // capturing a stale value. Updated on every render.
  const latestPlaybackStateRef = useRef(state.playbackState)
  latestPlaybackStateRef.current = state.playbackState

  const toggle = useCallback(() => {
    const eng = engineRef.current
    if (!eng) return
    if (latestPlaybackStateRef.current === 'playing') {
      eng.pause()
    } else {
      eng.play()
    }
  }, [])

  const seek = useCallback((seconds: number) => {
    engineRef.current?.seek(seconds)
    dispatch({ type: 'SEEK', seconds })
  }, [])

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    engineRef.current?.setRate(speed)
    dispatch({ type: 'SET_SPEED', speed })
  }, [])

  const stop = useCallback(() => {
    lastPlayRequestIdRef.current++
    clearTickInterval()
    engineRef.current?.destroy()
    engineRef.current = null
    dispatch({ type: 'STOP' })
  }, [clearTickInterval])

  const expand = useCallback(() => dispatch({ type: 'EXPAND' }), [])
  const minimize = useCallback(() => dispatch({ type: 'MINIMIZE' }), [])

  const close = useCallback(() => {
    // Stop audio and clear track — sheet goes to closed state.
    lastPlayRequestIdRef.current++
    clearTickInterval()
    engineRef.current?.destroy()
    engineRef.current = null
    dispatch({ type: 'CLOSE' })
  }, [clearTickInterval])

  const dismissError = useCallback(() => dispatch({ type: 'DISMISS_ERROR' }), [])

  const actions = useMemo<AudioPlayerActions>(
    () => ({
      play,
      pause,
      toggle,
      seek,
      setSpeed,
      stop,
      expand,
      minimize,
      close,
      dismissError,
    }),
    [play, pause, toggle, seek, setSpeed, stop, expand, minimize, close, dismissError],
  )

  // Cleanup engine on unmount
  useEffect(() => {
    return () => {
      if (tickIntervalRef.current !== null) clearInterval(tickIntervalRef.current)
      engineRef.current?.destroy()
    }
  }, [])

  // Media Session sync — only on track/playbackState changes
  useEffect(() => {
    if (state.track && state.playbackState !== 'idle') {
      updateMediaSession(state.track, actions)
    } else {
      clearMediaSession()
    }
  }, [state.track, state.playbackState, actions])

  const value = useMemo(() => ({ state, actions }), [state, actions])

  return (
    <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>
  )
}
