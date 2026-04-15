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
 *
 * BB-29 — continuous playback / auto-advance:
 *   The provider now loads the `bb29-v1:continuousPlayback` preference at
 *   mount (lazy reducer init), wires `onEnd` through a shared end-of-track
 *   handler that either auto-advances to the next chapter or dispatches
 *   STOP depending on the preference, and exposes `setContinuousPlayback`
 *   and `startFromGenesis` actions. All navigation uses `{ replace: true }`
 *   so browser history doesn't accumulate a chapter per auto-advance.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAudioDispatch as useAmbientDispatch } from '@/components/audio/AudioProvider'
import type {
  AudioPlayerActions,
  AudioPlayerState,
  PlaybackSpeed,
  PlayerTrack,
  SleepTimerInfo,
} from '@/types/bible-audio'
import type { AudioEngineInstance } from '@/lib/audio/engine'
import { audioErrorMessageFor } from '@/lib/audio/error-messages'
import {
  clearMediaSession,
  updateMediaSession,
} from '@/lib/audio/media-session'
import {
  readContinuousPlayback,
  writeContinuousPlayback,
} from '@/lib/audio/continuous-playback'
import { SLEEP_FADE_DURATION_MS } from '@/lib/audio/sleep-timer'
import { BIBLE_BOOKS } from '@/constants/bible'
import {
  resolveNextTrack,
  type ResolveNextTrackDeps,
} from '@/lib/audio/next-track'
import {
  resolveFcbhBookCode,
  resolveFcbhFilesetForBook,
} from '@/lib/audio/book-codes'
import { getCachedChapterAudio, setCachedChapterAudio } from '@/lib/audio/audio-cache'
import { getChapterAudio } from '@/lib/audio/dbp-client'
import { getAdjacentChapter } from '@/data/bible'
import { AudioPlayerContext, initialState, reducer } from './AudioPlayerContext'

interface AudioPlayerProviderProps {
  children: ReactNode
  /**
   * Test-only dependency injection seam for `resolveNextTrack`. Production
   * callers must omit this — real code hits DBP via the real client.
   */
  __resolveNextTrackDeps?: ResolveNextTrackDeps
}

export function AudioPlayerProvider({
  children,
  __resolveNextTrackDeps,
}: AudioPlayerProviderProps) {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    (): AudioPlayerState => ({
      ...initialState,
      continuousPlayback: readContinuousPlayback(),
    }),
  )
  const navigate = useNavigate()
  const engineRef = useRef<AudioEngineInstance | null>(null)
  const tickIntervalRef = useRef<number | null>(null)
  // Rapid-navigation supersession — each play() call captures the current
  // request id; if a later call increments this ref past the captured id,
  // the earlier call bails out of any async work it's still doing.
  const lastPlayRequestIdRef = useRef(0)

  // Ref mirror of continuousPlayback so closures (onEnd) read the current
  // value instead of capturing a stale one. Updated on every render.
  const latestContinuousPlaybackRef = useRef(state.continuousPlayback)
  latestContinuousPlaybackRef.current = state.continuousPlayback

  // BB-28 — ref mirror for sleep timer (same pattern)
  const latestSleepTimerRef = useRef(state.sleepTimer)
  latestSleepTimerRef.current = state.sleepTimer

  // Shared end-of-track handler. Both play() and autoAdvance wire their
  // engine's onEnd here so the continuous-playback gate lives in a single
  // place, and so we don't need circular useCallback dependencies between
  // play and autoAdvance.
  const handleEndRef = useRef<(endedTrack: PlayerTrack) => void>(() => {})

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
            handleEndRef.current(track)
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

  // BB-29 — auto-advance: fetch the next chapter and swap engines in-place
  // without touching sheetState. Uses the same supersession pattern as play.
  const autoAdvance = useCallback(
    async (currentTrack: PlayerTrack): Promise<void> => {
      const myId = ++lastPlayRequestIdRef.current

      if (engineRef.current) {
        engineRef.current.destroy()
        engineRef.current = null
      }
      clearTickInterval()

      let result: Awaited<ReturnType<typeof resolveNextTrack>>
      try {
        result = await resolveNextTrack(currentTrack, __resolveNextTrackDeps)
      } catch (err) {
        if (myId !== lastPlayRequestIdRef.current) return
        dispatch({ type: 'LOAD_ERROR', message: audioErrorMessageFor(err) })
        return
      }

      if (myId !== lastPlayRequestIdRef.current) return

      if (result.kind === 'end-of-bible') {
        dispatch({ type: 'END_OF_BIBLE' })
        return
      }

      const nextTrack = result.track
      dispatch({ type: 'LOAD_NEXT_CHAPTER_START', track: nextTrack })
      navigate(`/bible/${nextTrack.book}/${nextTrack.chapter}`, { replace: true })

      let newEngine: AudioEngineInstance | null = null
      try {
        const { createEngineInstance } = await import('@/lib/audio/engine')
        if (myId !== lastPlayRequestIdRef.current) return

        newEngine = await createEngineInstance(nextTrack.url, {
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
            handleEndRef.current(nextTrack)
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
    [clearTickInterval, startTickInterval, navigate, __resolveNextTrackDeps],
  )

  // Wire the shared end-of-track handler on every render so it always
  // reflects the latest autoAdvance closure and the latest preference.
  // BB-28 extends this to handle structural sleep timer presets.
  handleEndRef.current = (endedTrack: PlayerTrack) => {
    const timer = latestSleepTimerRef.current

    if (timer?.type === 'end-of-chapter') {
      dispatch({ type: 'START_SLEEP_FADE' })
      return
    }

    if (timer?.type === 'end-of-book') {
      const book = BIBLE_BOOKS.find((b) => b.slug === endedTrack.book)
      if (book && endedTrack.chapter >= book.chapters) {
        dispatch({ type: 'START_SLEEP_FADE' })
        return
      }
      // Not last chapter of book — force auto-advance within book
      void autoAdvance(endedTrack)
      return
    }

    // Normal behavior (duration timer continues counting, or no timer)
    if (latestContinuousPlaybackRef.current) {
      void autoAdvance(endedTrack)
    } else {
      dispatch({ type: 'STOP' })
    }
  }

  // Keep a ref mirror of playbackState so `toggle` can read it without
  // capturing a stale value. Updated on every render.
  const latestPlaybackStateRef = useRef(state.playbackState)
  latestPlaybackStateRef.current = state.playbackState

  // BB-27 — ambient audio pause coordination
  const ambientDispatch = useAmbientDispatch()
  const prevPlaybackStateRef = useRef(state.playbackState)

  useEffect(() => {
    const prev = prevPlaybackStateRef.current
    const curr = state.playbackState
    prevPlaybackStateRef.current = curr

    const wasIdle = prev === 'idle'
    const nowActive = curr === 'loading' || curr === 'playing'
    const wasActive = prev === 'loading' || prev === 'playing' || prev === 'paused' || prev === 'error'
    const nowIdle = curr === 'idle'

    if (wasIdle && nowActive) {
      ambientDispatch({ type: 'PAUSE_BY_BIBLE_AUDIO' })
    } else if (wasActive && nowIdle) {
      ambientDispatch({ type: 'RESUME_FROM_BIBLE_AUDIO' })
    }
  }, [state.playbackState, ambientDispatch])

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

  const setContinuousPlayback = useCallback((enabled: boolean) => {
    writeContinuousPlayback(enabled)
    dispatch({ type: 'SET_CONTINUOUS_PLAYBACK', enabled })
  }, [])

  const startFromGenesis = useCallback(async (): Promise<void> => {
    const filesetId = resolveFcbhFilesetForBook('genesis')
    const bookCode = resolveFcbhBookCode('genesis')
    if (!filesetId || !bookCode) return

    let audioUrl: string | null = null
    try {
      const cached = getCachedChapterAudio(filesetId, bookCode, 1)
      if (cached) {
        audioUrl = cached.url
      } else {
        const audio = await getChapterAudio(filesetId, bookCode, 1)
        setCachedChapterAudio(filesetId, bookCode, 1, audio)
        audioUrl = audio.url
      }
    } catch (err) {
      dispatch({ type: 'LOAD_ERROR', message: audioErrorMessageFor(err) })
      return
    }

    await play({
      filesetId,
      book: 'genesis',
      bookDisplayName: 'Genesis',
      chapter: 1,
      translation: 'World English Bible',
      url: audioUrl,
    })
    navigate('/bible/genesis/1', { replace: true })
  }, [play, navigate])

  // BB-28 — sleep timer action callbacks
  const setSleepTimer = useCallback((timer: SleepTimerInfo) => {
    dispatch({ type: 'SET_SLEEP_TIMER', timer })
  }, [])

  const cancelSleepTimer = useCallback(() => {
    // Restore volume before clearing state
    engineRef.current?.setVolume(1.0)
    dispatch({ type: 'CANCEL_SLEEP_TIMER' })
  }, [])

  // BB-28 — fade volume management via useEffect
  useEffect(() => {
    if (!state.sleepFade || !engineRef.current) return
    const { remainingMs } = state.sleepFade
    const progress = (SLEEP_FADE_DURATION_MS - remainingMs) / SLEEP_FADE_DURATION_MS
    const volume = Math.pow(1 - progress, 2)
    engineRef.current.setVolume(volume)
    if (remainingMs <= 0) {
      stop()
    }
  }, [state.sleepFade, stop])

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
      setContinuousPlayback,
      startFromGenesis,
      setSleepTimer,
      cancelSleepTimer,
    }),
    [
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
      setContinuousPlayback,
      startFromGenesis,
      setSleepTimer,
      cancelSleepTimer,
    ],
  )

  // Cleanup engine on unmount
  useEffect(() => {
    return () => {
      if (tickIntervalRef.current !== null) clearInterval(tickIntervalRef.current)
      engineRef.current?.destroy()
    }
  }, [])

  // Media Session sync — only on track/playbackState changes.
  // BB-29 wires nexttrack / previoustrack so lock-screen + headphone buttons
  // can advance chapters manually.
  useEffect(() => {
    if (state.track && state.playbackState !== 'idle') {
      const currentTrack = state.track

      const onNextTrack = () => {
        // Manual next always runs through autoAdvance — even when
        // continuousPlayback is off. The preference only gates the
        // automatic path (onEnd). Revelation 22 still produces
        // END_OF_BIBLE via the autoAdvance cascade.
        void autoAdvance(currentTrack)
      }

      const onPrevTrack = () => {
        const prev = getAdjacentChapter(
          currentTrack.book,
          currentTrack.chapter,
          'prev',
        )
        if (!prev) return // already at Genesis 1

        const filesetId = resolveFcbhFilesetForBook(prev.bookSlug)
        const bookCode = resolveFcbhBookCode(prev.bookSlug)
        if (!filesetId || !bookCode) return

        void (async () => {
          let url: string
          const cached = getCachedChapterAudio(filesetId, bookCode, prev.chapter)
          if (cached) {
            url = cached.url
          } else {
            try {
              const audio = await getChapterAudio(filesetId, bookCode, prev.chapter)
              setCachedChapterAudio(filesetId, bookCode, prev.chapter, audio)
              url = audio.url
            } catch {
              return // silent — media session fallback
            }
          }
          await play({
            filesetId,
            book: prev.bookSlug,
            bookDisplayName: prev.bookName,
            chapter: prev.chapter,
            translation: currentTrack.translation,
            url,
          })
          // Push (not replace) for manual backward navigation
          navigate(`/bible/${prev.bookSlug}/${prev.chapter}`, { replace: false })
        })()
      }

      updateMediaSession(state.track, actions, { onNextTrack, onPrevTrack })
    } else {
      clearMediaSession()
    }
  }, [state.track, state.playbackState, actions, autoAdvance, play, navigate])

  const value = useMemo(() => ({ state, actions }), [state, actions])

  return (
    <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>
  )
}
