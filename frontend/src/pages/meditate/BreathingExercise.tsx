import { useState, useRef, useCallback, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { CompletionScreen } from '@/components/daily/CompletionScreen'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { getBreathingVerses } from '@/mocks/daily-experience-mock-data'
import { BREATHING_PHASES, DURATION_OPTIONS } from '@/constants/daily-experience'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { playChime } from '@/lib/audio'
import { cn } from '@/lib/utils'

type Phase = 'breatheIn' | 'hold' | 'breatheOut'
type Screen = 'prestart' | 'exercise' | 'complete'

const CYCLE_DURATION =
  BREATHING_PHASES.breatheIn.duration +
  BREATHING_PHASES.hold.duration +
  BREATHING_PHASES.breatheOut.duration // 19s

function speakPhase(label: string) {
  try {
    const utterance = new SpeechSynthesisUtterance(label)
    utterance.rate = 0.9
    utterance.volume = 0.7
    speechSynthesis.speak(utterance)
  } catch {
    // Speech synthesis not available
  }
}

export function BreathingExercise() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/daily?tab=meditate" replace state={{ authRedirectMessage: 'Sign in to access guided meditations.' }} />
  return <BreathingExerciseContent />
}

function BreathingExerciseContent() {
  const [screen, setScreen] = useState<Screen>('prestart')
  const [duration, setDuration] = useState<number | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [chimeEnabled, setChimeEnabled] = useState(true)
  const [currentPhase, setCurrentPhase] = useState<Phase>('breatheIn')
  const [countdown, setCountdown] = useState(0)
  const [verseText, setVerseText] = useState('')
  const [verseRef, setVerseRef] = useState('')

  const rafRef = useRef<number>(0)
  const startTimeRef = useRef(0)
  const prevPhaseRef = useRef<Phase | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const totalDurationRef = useRef(0)

  const { markMeditationComplete } = useCompletionTracking()
  const { recordActivity } = useFaithPoints()

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  useEffect(() => {
    if (screen === 'exercise') {
      window.onbeforeunload = () => 'Leave exercise? Your progress will be lost.'
    } else {
      window.onbeforeunload = null
    }
    return () => {
      window.onbeforeunload = null
    }
  }, [screen])

  const handleBegin = useCallback(() => {
    if (!duration) return

    // Pick random verse
    const verses = getBreathingVerses()
    const verse = verses[Math.floor(Math.random() * verses.length)]
    setVerseText(verse.text)
    setVerseRef(verse.reference)

    totalDurationRef.current = duration * 60
    startTimeRef.current = performance.now()
    prevPhaseRef.current = null
    setScreen('exercise')

    // Request wake lock
    navigator.wakeLock?.request('screen').then((lock) => {
      wakeLockRef.current = lock
    }).catch(() => {})

    // Start animation loop
    const tick = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000

      if (elapsed >= totalDurationRef.current) {
        // Exercise complete
        cleanup()
        markMeditationComplete('breathing')
        recordActivity('meditate')
        setScreen('complete')
        return
      }

      // Determine phase within current cycle
      const cycleElapsed = elapsed % CYCLE_DURATION
      let phase: Phase
      let phaseCountdown: number

      if (cycleElapsed < BREATHING_PHASES.breatheIn.duration) {
        phase = 'breatheIn'
        phaseCountdown = Math.ceil(BREATHING_PHASES.breatheIn.duration - cycleElapsed)
      } else if (
        cycleElapsed <
        BREATHING_PHASES.breatheIn.duration + BREATHING_PHASES.hold.duration
      ) {
        phase = 'hold'
        phaseCountdown = Math.ceil(
          BREATHING_PHASES.breatheIn.duration +
            BREATHING_PHASES.hold.duration -
            cycleElapsed,
        )
      } else {
        phase = 'breatheOut'
        phaseCountdown = Math.ceil(CYCLE_DURATION - cycleElapsed)
      }

      setCurrentPhase(phase)
      setCountdown(phaseCountdown)

      // Trigger chime/voice on phase change
      if (prevPhaseRef.current !== null && prevPhaseRef.current !== phase) {
        if (chimeEnabled) playChime()
        if (voiceEnabled) speakPhase(BREATHING_PHASES[phase].label)
      }
      prevPhaseRef.current = phase

      rafRef.current = requestAnimationFrame(tick)
    }

    // Initial chime/voice for first phase
    if (chimeEnabled) playChime()
    if (voiceEnabled) speakPhase(BREATHING_PHASES.breatheIn.label)

    rafRef.current = requestAnimationFrame(tick)
  }, [duration, chimeEnabled, voiceEnabled, cleanup, markMeditationComplete, recordActivity])

  if (screen === 'complete') {
    return (
      <Layout hero={<PageHero title="Breathing Exercise" />}>
        <CompletionScreen
          ctas={[
            { label: 'Meditate more', to: '/meditate/breathing' },
            { label: 'Try a different meditation', to: '/daily?tab=meditate' },
            { label: 'Continue to Pray \u2192', to: '/daily?tab=pray' },
            { label: 'Continue to Journal \u2192', to: '/daily?tab=journal' },
            { label: 'Visit the Prayer Wall \u2192', to: '/prayer-wall' },
          ]}
        />
      </Layout>
    )
  }

  if (screen === 'exercise') {
    const circleScale =
      currentPhase === 'breatheIn'
        ? 'scale-100'
        : currentPhase === 'hold'
          ? 'scale-100'
          : 'scale-75'

    const circleTransition =
      currentPhase === 'breatheIn'
        ? 'transition-transform duration-[4000ms] ease-in-out'
        : currentPhase === 'hold'
          ? 'transition-transform duration-[7000ms]'
          : 'transition-transform duration-[8000ms] ease-in-out'

    return (
      <Layout hero={<PageHero title="Breathing Exercise" />}>
        <div className="flex flex-col items-center px-4 py-10 text-center sm:py-16">
          {/* Breathing circle */}
          <div className="relative mb-8 flex h-48 w-48 items-center justify-center sm:h-64 sm:w-64">
            <div
              className={cn(
                'h-full w-full rounded-full bg-primary/20 shadow-[0_0_60px_rgba(109,40,217,0.3)]',
                circleScale,
                circleTransition,
              )}
            />
          </div>

          {/* Phase label (announced to screen readers on change) */}
          <div aria-live="polite" className="mb-6">
            <p className="text-2xl font-semibold text-text-dark sm:text-3xl">
              {BREATHING_PHASES[currentPhase].label}
            </p>
          </div>
          {/* Countdown (visual only, not announced to avoid overwhelming SR) */}
          <p className="mb-6 text-4xl font-bold text-primary sm:text-5xl" aria-hidden="true">
            {countdown}
          </p>

          {/* Scripture verse */}
          <div className="mx-auto max-w-lg">
            <blockquote className="font-serif text-lg italic leading-relaxed text-text-light">
              &ldquo;{verseText}&rdquo;
            </blockquote>
            <p className="mt-2 text-sm text-text-light">
              {verseRef} WEB
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  // Pre-start screen
  return (
    <Layout hero={<PageHero title="Breathing Exercise" subtitle="Follow a 4-7-8 breathing pattern with scripture to focus your mind." />}>
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        {/* Duration selector */}
        <div className="mb-6">
          <p className="mb-3 text-center text-sm font-medium text-text-dark">
            Choose duration
          </p>
          <div className="flex justify-center gap-3">
            {DURATION_OPTIONS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDuration(mins)}
                className={cn(
                  'rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors',
                  duration === mins
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-white text-text-dark hover:bg-gray-50',
                )}
                aria-pressed={duration === mins}
              >
                {mins} min
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-dark">
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Voice guidance
          </label>
          <label className="flex items-center gap-2 text-sm text-text-dark">
            <input
              type="checkbox"
              checked={chimeEnabled}
              onChange={(e) => setChimeEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Chime sounds
          </label>
        </div>

        {/* Begin button */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleBegin}
            disabled={!duration}
            className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            Begin
          </button>
        </div>
      </div>
    </Layout>
  )
}
