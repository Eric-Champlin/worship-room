import { useState, useRef, useCallback, useEffect } from 'react'
import type {
  GuidedPrayerSession,
  GuidedPrayerSegment,
} from '@/types/guided-prayer'
import { THEME_SCENE_MAP } from '@/data/guided-prayer-sessions'
import { SCENE_BY_ID } from '@/data/scenes'
import { playChime } from '@/lib/audio'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAudioState, useAudioDispatch } from '@/components/audio/AudioProvider'
import { useScenePlayer } from '@/hooks/useScenePlayer'

export interface UseGuidedPrayerPlayerProps {
  session: GuidedPrayerSession | null
  onComplete: () => void
  onClose: () => void
}

export interface UseGuidedPrayerPlayerReturn {
  isPlaying: boolean
  isPaused: boolean
  isComplete: boolean
  currentSegmentIndex: number
  currentSegment: GuidedPrayerSegment | null
  currentWordIndex: number
  ttsAvailable: boolean
  elapsedSeconds: number
  totalDurationSeconds: number
  progressPercent: number
  play: () => void
  pause: () => void
  stop: () => void
  autoStartedAmbient: boolean
  ambientSceneName: string | null
}

type PlayerState = 'idle' | 'playing' | 'paused' | 'complete'

export function useGuidedPrayerPlayer({
  session,
  onComplete,
  onClose,
}: UseGuidedPrayerPlayerProps): UseGuidedPrayerPlayerReturn {
  const prefersReduced = useReducedMotion()
  const audioState = useAudioState()
  const audioDispatch = useAudioDispatch()
  const { loadScene } = useScenePlayer()

  const [playerState, setPlayerState] = useState<PlayerState>('idle')
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [autoStartedAmbient, setAutoStartedAmbient] = useState(false)
  const [ambientSceneName, setAmbientSceneName] = useState<string | null>(null)

  // TTS availability check
  const [ttsAvailable] = useState(() => {
    if (typeof window === 'undefined') return false
    return 'speechSynthesis' in window
  })

  // Refs for cleanup
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const ttsFinishedRef = useRef(false)
  const timerFinishedRef = useRef(false)
  const autoStartedAmbientRef = useRef(false)
  const resumingRef = useRef(false)
  const sessionRef = useRef(session)
  const playerStateRef = useRef(playerState)
  const currentSegmentIndexRef = useRef(currentSegmentIndex)
  const onCompleteRef = useRef(onComplete)
  const onCloseRef = useRef(onClose)

  // Keep refs in sync
  sessionRef.current = session
  playerStateRef.current = playerState
  currentSegmentIndexRef.current = currentSegmentIndex
  onCompleteRef.current = onComplete
  onCloseRef.current = onClose

  // Calculate total duration
  const totalDurationSeconds = session
    ? session.script.reduce((sum, seg) => sum + seg.durationSeconds, 0)
    : 0

  const progressPercent =
    totalDurationSeconds > 0
      ? Math.min(100, (elapsedSeconds / totalDurationSeconds) * 100)
      : 0

  const currentSegment = session?.script[currentSegmentIndex] ?? null

  // --- Cleanup helpers ---

  const clearTimers = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current)
      segmentTimerRef.current = null
    }
  }, [])

  const cancelTTS = useCallback(() => {
    if (ttsAvailable && typeof window !== 'undefined') {
      window.speechSynthesis.cancel()
    }
    utteranceRef.current = null
  }, [ttsAvailable])

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }, [])

  // --- Advance to next segment ---

  const advanceSegment = useCallback(() => {
    const sess = sessionRef.current
    if (!sess) return

    const nextIndex = currentSegmentIndexRef.current + 1
    if (nextIndex >= sess.script.length) {
      // All segments complete
      clearTimers()
      cancelTTS()
      setPlayerState('complete')
      onCompleteRef.current()
      return
    }

    setCurrentSegmentIndex(nextIndex)
    currentSegmentIndexRef.current = nextIndex
    setCurrentWordIndex(0)
    ttsFinishedRef.current = false
    timerFinishedRef.current = false
  }, [clearTimers, cancelTTS])

  // --- Check if both TTS and timer are done for narration segments ---

  const checkSegmentComplete = useCallback(() => {
    if (ttsFinishedRef.current && timerFinishedRef.current) {
      advanceSegment()
    }
  }, [advanceSegment])

  // --- Start a segment ---

  const startSegment = useCallback(
    (segment: GuidedPrayerSegment, _index: number) => {
      ttsFinishedRef.current = false
      timerFinishedRef.current = false

      if (segment.type === 'silence') {
        // Play chime at start of silence
        playChime()
        ttsFinishedRef.current = true // No TTS for silence

        // Timer for silence duration
        segmentTimerRef.current = setTimeout(() => {
          timerFinishedRef.current = true
          advanceSegment()
        }, segment.durationSeconds * 1000)
      } else {
        // Narration segment
        if (ttsAvailable && typeof window !== 'undefined') {
          // Cancel any previous speech
          window.speechSynthesis.cancel()

          const utterance = new SpeechSynthesisUtterance(segment.text)
          utterance.rate = 0.9
          utteranceRef.current = utterance

          utterance.onboundary = (event: SpeechSynthesisEvent) => {
            if (event.name === 'word') {
              // Count words up to charIndex to get word index
              const textBefore = segment.text.slice(0, event.charIndex)
              const wordIndex = textBefore.split(/\s+/).filter(Boolean).length
              setCurrentWordIndex(wordIndex)
            }
          }

          utterance.onend = () => {
            ttsFinishedRef.current = true
            checkSegmentComplete()
          }

          utterance.onerror = () => {
            ttsFinishedRef.current = true
            checkSegmentComplete()
          }

          window.speechSynthesis.speak(utterance)
        } else {
          // TTS not available — mark as done immediately
          ttsFinishedRef.current = true
        }

        // Timer for segment duration
        segmentTimerRef.current = setTimeout(() => {
          timerFinishedRef.current = true
          if (ttsAvailable) {
            checkSegmentComplete()
          } else {
            // Without TTS, timer alone drives advancement
            advanceSegment()
          }
        }, segment.durationSeconds * 1000)
      }
    },
    [ttsAvailable, advanceSegment, checkSegmentComplete]
  )

  // --- Play segment when index changes and state is playing ---

  useEffect(() => {
    if (playerState !== 'playing' || !session) return

    // Skip startSegment when resuming from pause — TTS was already resumed via
    // speechSynthesis.resume() and the segment timer will be restarted below only
    // for the remaining time, not from scratch.
    if (resumingRef.current) {
      resumingRef.current = false
      return
    }

    const segment = session.script[currentSegmentIndex]
    if (!segment) return

    // Clear previous timers before starting new segment
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current)
      segmentTimerRef.current = null
    }

    startSegment(segment, currentSegmentIndex)
  }, [currentSegmentIndex, playerState, session, startSegment])

  // --- Elapsed timer ---

  useEffect(() => {
    if (playerState === 'playing') {
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 0.25)
      }, 250)
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current)
        elapsedTimerRef.current = null
      }
    }
    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current)
        elapsedTimerRef.current = null
      }
    }
  }, [playerState])

  // --- Ambient auto-pairing on session start ---

  useEffect(() => {
    if (!session || playerState !== 'idle') return

    const shouldAutoPlay =
      !prefersReduced &&
      audioState.activeSounds.length === 0 &&
      !audioState.pillVisible &&
      !audioState.activeRoutine

    if (shouldAutoPlay) {
      const sceneId = THEME_SCENE_MAP[session.theme]
      const scene = SCENE_BY_ID.get(sceneId)
      if (scene) {
        audioDispatch({ type: 'SET_MASTER_VOLUME', payload: { volume: 0.3 } })
        loadScene(scene)
        setAutoStartedAmbient(true)
        autoStartedAmbientRef.current = true
        setAmbientSceneName(scene.name)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])
  // Only re-run when session changes. audioDispatch/loadScene are stable refs.
  // prefersReduced and audioState are intentionally read at call-time, not reactive.

  // --- Wake lock on session start ---

  useEffect(() => {
    if (!session) return

    async function requestWakeLock() {
      try {
        wakeLockRef.current = await navigator.wakeLock?.request('screen')
      } catch (_e) {
        // Fail silently
      }
    }
    requestWakeLock()

    return () => {
      releaseWakeLock()
    }
  }, [session, releaseWakeLock])

  // --- Cleanup on unmount ---

  useEffect(() => {
    return () => {
      cancelTTS()
      clearTimers()
      releaseWakeLock()
    }
  }, [cancelTTS, clearTimers, releaseWakeLock])

  // --- Controls ---

  const play = useCallback(() => {
    if (playerState === 'idle') {
      setPlayerState('playing')
      setCurrentSegmentIndex(0)
      currentSegmentIndexRef.current = 0
      setElapsedSeconds(0)
      setCurrentWordIndex(0)
    } else if (playerState === 'paused') {
      resumingRef.current = true
      setPlayerState('playing')
      if (ttsAvailable && typeof window !== 'undefined') {
        window.speechSynthesis.resume()
      }
    }
  }, [playerState, ttsAvailable])

  const pause = useCallback(() => {
    if (playerState !== 'playing') return
    setPlayerState('paused')
    if (ttsAvailable && typeof window !== 'undefined') {
      window.speechSynthesis.pause()
    }
    // Clear segment timer (will be restarted on resume via effect)
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current)
      segmentTimerRef.current = null
    }
  }, [playerState, ttsAvailable])

  const stop = useCallback(() => {
    cancelTTS()
    clearTimers()
    releaseWakeLock()
    if (autoStartedAmbientRef.current) {
      audioDispatch({ type: 'STOP_ALL' })
    }
    setPlayerState('idle')
    setCurrentSegmentIndex(0)
    setElapsedSeconds(0)
    setCurrentWordIndex(0)
    setAutoStartedAmbient(false)
    autoStartedAmbientRef.current = false
    setAmbientSceneName(null)
    onCloseRef.current()
  }, [cancelTTS, clearTimers, releaseWakeLock, audioDispatch])

  return {
    isPlaying: playerState === 'playing',
    isPaused: playerState === 'paused',
    isComplete: playerState === 'complete',
    currentSegmentIndex,
    currentSegment,
    currentWordIndex,
    ttsAvailable,
    elapsedSeconds,
    totalDurationSeconds,
    progressPercent,
    play,
    pause,
    stop,
    autoStartedAmbient,
    ambientSceneName,
  }
}
