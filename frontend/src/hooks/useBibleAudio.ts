import { useCallback, useEffect, useRef, useState } from 'react'
import type { BibleVerse } from '@/types/bible'
import {
  useAudioState,
  useAudioEngine,
  useSleepTimerControls,
} from '@/components/audio/AudioProvider'
import { saveMeditationSession } from '@/services/meditation-storage'
import { getLocalDateString } from '@/utils/date'
import { useAudioDucking } from './useAudioDucking'

interface UseBibleAudioOptions {
  verses: BibleVerse[]
  bookSlug: string
  chapterNumber: number
  isAuthenticated: boolean
  hasFullText: boolean
  isChapterAlreadyRead: boolean
  onChapterComplete: () => void
  onAnnounce?: (message: string) => void
}

export interface UseBibleAudioReturn {
  playbackState: 'idle' | 'playing' | 'paused'
  currentVerseIndex: number
  totalVerses: number
  speed: number
  setSpeed: (speed: number) => void
  voiceGender: 'male' | 'female'
  setVoiceGender: (gender: 'male' | 'female') => void
  availableVoiceCount: number
  play: () => void
  pause: () => void
  stop: () => void
  isSupported: boolean
}

const INTER_VERSE_DELAY_MS = 300
const AUTO_SCROLL_RESUME_DELAY_MS = 5000

export function useBibleAudio({
  verses,
  bookSlug,
  chapterNumber,
  isAuthenticated,
  hasFullText,
  isChapterAlreadyRead,
  onChapterComplete,
  onAnnounce,
}: UseBibleAudioOptions): UseBibleAudioReturn {
  const [playbackState, setPlaybackState] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [currentVerseIndex, setCurrentVerseIndex] = useState(-1)
  const [speed, setSpeed] = useState(1)
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female')
  const [availableVoiceCount, setAvailableVoiceCount] = useState(0)

  const audioState = useAudioState()
  const engine = useAudioEngine()
  const sleepTimer = useSleepTimerControls()

  const ducking = useAudioDucking({
    engine,
    activeSoundsCount: audioState.activeSounds.length,
    masterVolume: audioState.masterVolume,
    sleepTimerPhase: sleepTimer.phase,
  })

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const interVerseTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const startTimeRef = useRef<number | null>(null)
  const autoScrollPausedRef = useRef(false)
  const scrollResumeTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const playbackStateRef = useRef(playbackState)
  playbackStateRef.current = playbackState
  const currentVerseIndexRef = useRef(currentVerseIndex)
  currentVerseIndexRef.current = currentVerseIndex
  const speedRef = useRef(speed)
  speedRef.current = speed
  const voiceGenderRef = useRef(voiceGender)
  voiceGenderRef.current = voiceGender
  const sleepTimerPhaseRef = useRef(sleepTimer.phase)
  sleepTimerPhaseRef.current = sleepTimer.phase

  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window

  // Track voices
  useEffect(() => {
    if (!isSupported) return

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      const englishVoices = voices.filter((v) => v.lang.startsWith('en'))
      setAvailableVoiceCount(englishVoices.length)
    }

    updateVoices()
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices)
    }
  }, [isSupported])

  // Reduced motion check
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Get best matching voice for the current gender preference
  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!isSupported) return null
    const voices = window.speechSynthesis.getVoices()
    const gender = voiceGenderRef.current
    return (
      voices.find(
        (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes(gender),
      ) ??
      voices.find((v) => v.lang.startsWith('en')) ??
      null
    )
  }, [isSupported])

  // Auto-scroll to verse
  const scrollToVerse = useCallback(
    (verseNumber: number) => {
      if (prefersReducedMotion || autoScrollPausedRef.current) return
      const el = document.getElementById(`verse-${verseNumber}`)
      if (!el) return

      // Check if already visible
      const rect = el.getBoundingClientRect()
      const inViewport =
        rect.top >= 0 && rect.bottom <= window.innerHeight
      if (inViewport) return

      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    [prefersReducedMotion],
  )

  // Manual scroll detection — pauses auto-scroll temporarily
  useEffect(() => {
    if (playbackState !== 'playing') return

    const handleScroll = () => {
      autoScrollPausedRef.current = true
      if (scrollResumeTimerRef.current) {
        clearTimeout(scrollResumeTimerRef.current)
      }
      scrollResumeTimerRef.current = setTimeout(() => {
        autoScrollPausedRef.current = false
      }, AUTO_SCROLL_RESUME_DELAY_MS)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollResumeTimerRef.current) {
        clearTimeout(scrollResumeTimerRef.current)
      }
    }
  }, [playbackState])

  // Speak a single verse by index
  const speakVerse = useCallback(
    (index: number) => {
      if (!isSupported || !verses[index]) return

      const utterance = new SpeechSynthesisUtterance(verses[index].text)
      utterance.rate = speedRef.current
      const voice = getVoice()
      if (voice) utterance.voice = voice

      utteranceRef.current = utterance
      setCurrentVerseIndex(index)
      setPlaybackState('playing')

      // Auto-scroll
      scrollToVerse(verses[index].number)

      // Duck ambient volume for this verse
      ducking.duckForVerse()

      // Sleep timer TTS volume fade: progressively reduce utterance volume
      if (sleepTimerPhaseRef.current === 'fading' && sleepTimer.fadeDurationMs > 0) {
        const fadeRatio = Math.max(0, sleepTimer.remainingMs / sleepTimer.fadeDurationMs)
        utterance.volume = Math.max(0.05, fadeRatio)
      }

      utterance.onend = () => {
        // Unduck between verses
        ducking.unduckForPause()

        // Check if we should stop (sleep timer fading/complete)
        const timerPhase = sleepTimerPhaseRef.current
        if (timerPhase === 'complete') {
          // Timer done — stop TTS
          setPlaybackState('idle')
          setCurrentVerseIndex(-1)
          utteranceRef.current = null
          onAnnounce?.('Reading stopped by sleep timer')
          return
        }

        const nextIndex = index + 1
        if (nextIndex < verses.length) {
          // Inter-verse pause then next
          interVerseTimerRef.current = setTimeout(() => {
            // Re-check state — user may have stopped during pause
            if (playbackStateRef.current === 'idle') return
            speakVerse(nextIndex)
          }, INTER_VERSE_DELAY_MS)
        } else {
          // Chapter complete
          setPlaybackState('idle')
          setCurrentVerseIndex(-1)
          ducking.unduckWithRamp()
          utteranceRef.current = null

          // Mark chapter read
          if (isAuthenticated && !isChapterAlreadyRead) {
            onChapterComplete()
          }

          // Record meditation session
          if (isAuthenticated && startTimeRef.current !== null) {
            const durationMs = Date.now() - startTimeRef.current
            const durationMinutes = Math.max(1, Math.round(durationMs / 60000))
            saveMeditationSession({
              id: crypto.randomUUID(),
              type: 'bible-audio',
              date: getLocalDateString(new Date()),
              durationMinutes,
              completedAt: new Date().toISOString(),
            })
          }
          startTimeRef.current = null
          onAnnounce?.('Chapter reading complete')
        }
      }

      utterance.onerror = () => {
        setPlaybackState('idle')
        setCurrentVerseIndex(-1)
        ducking.unduckImmediate()
        utteranceRef.current = null
        startTimeRef.current = null
      }

      window.speechSynthesis.speak(utterance)
    },
    [
      isSupported,
      verses,
      getVoice,
      scrollToVerse,
      ducking,
      sleepTimer.remainingMs,
      sleepTimer.fadeDurationMs,
      isAuthenticated,
      isChapterAlreadyRead,
      onChapterComplete,
      onAnnounce,
    ],
  )

  const play = useCallback(() => {
    if (!isSupported || !hasFullText || verses.length === 0) return

    if (playbackState === 'paused') {
      window.speechSynthesis.resume()
      setPlaybackState('playing')
      ducking.duckForVerse()
      onAnnounce?.('Reading resumed')
      return
    }

    // Start fresh from verse 0
    window.speechSynthesis.cancel()
    startTimeRef.current = Date.now()
    autoScrollPausedRef.current = false
    onAnnounce?.('Reading chapter aloud')
    speakVerse(0)
  }, [isSupported, hasFullText, verses, playbackState, speakVerse, ducking, onAnnounce])

  const pause = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.pause()
    setPlaybackState('paused')
    ducking.unduckImmediate()
    onAnnounce?.('Reading paused')
  }, [isSupported, ducking, onAnnounce])

  const stop = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    if (interVerseTimerRef.current) {
      clearTimeout(interVerseTimerRef.current)
    }
    setPlaybackState('idle')
    setCurrentVerseIndex(-1)
    ducking.unduckWithRamp()
    utteranceRef.current = null
    startTimeRef.current = null
    autoScrollPausedRef.current = false
    onAnnounce?.('Reading stopped')
  }, [isSupported, ducking, onAnnounce])

  // Reset on chapter/book change
  useEffect(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    if (interVerseTimerRef.current) {
      clearTimeout(interVerseTimerRef.current)
    }
    setPlaybackState('idle')
    setCurrentVerseIndex(-1)
    ducking.unduckImmediate()
    utteranceRef.current = null
    startTimeRef.current = null
    autoScrollPausedRef.current = false
  }, [bookSlug, chapterNumber, isSupported, ducking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (interVerseTimerRef.current) {
        clearTimeout(interVerseTimerRef.current)
      }
      if (scrollResumeTimerRef.current) {
        clearTimeout(scrollResumeTimerRef.current)
      }
    }
  }, [])

  return {
    playbackState,
    currentVerseIndex,
    totalVerses: verses.length,
    speed,
    setSpeed,
    voiceGender,
    setVoiceGender,
    availableVoiceCount,
    play,
    pause,
    stop,
    isSupported,
  }
}
