import { useState, useRef, useCallback, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { CompletionScreen } from '@/components/daily/CompletionScreen'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { getSoakingVerses } from '@/mocks/daily-experience-mock-data'
import { DURATION_OPTIONS } from '@/constants/daily-experience'
import { playChime } from '@/lib/audio'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { DailyVerse } from '@/types/daily-experience'

type Screen = 'prestart' | 'exercise' | 'complete'

export function ScriptureSoaking() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/daily?tab=meditate" replace state={{ authRedirectMessage: 'Sign in to access guided meditations.' }} />
  return <ScriptureSoakingContent />
}

function ScriptureSoakingContent() {
  const verses = getSoakingVerses()
  const [screen, setScreen] = useState<Screen>('prestart')
  const [duration, setDuration] = useState<number | null>(null)
  const [verseIndex, setVerseIndex] = useState(() =>
    Math.floor(Math.random() * verses.length),
  )
  const [selectedVerse, setSelectedVerse] = useState<DailyVerse | null>(null)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const rafRef = useRef<number>(0)
  const startTimeRef = useRef(0)
  const elapsedBeforePauseRef = useRef(0)
  const totalDurationRef = useRef(0)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const { markMeditationComplete } = useCompletionTracking()

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const handleTryAnother = () => {
    let next = Math.floor(Math.random() * verses.length)
    while (next === verseIndex && verses.length > 1) {
      next = Math.floor(Math.random() * verses.length)
    }
    setVerseIndex(next)
  }

  const startTimer = useCallback(
    (totalSec: number, alreadyElapsed: number) => {
      startTimeRef.current = performance.now() - alreadyElapsed * 1000
      totalDurationRef.current = totalSec

      const tick = (now: number) => {
        const elapsed = (now - startTimeRef.current) / 1000
        if (elapsed >= totalDurationRef.current) {
          cleanup()
          playChime()
          markMeditationComplete('soaking')
          setScreen('complete')
          return
        }
        setProgress(elapsed / totalDurationRef.current)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [cleanup, markMeditationComplete],
  )

  const handleBegin = () => {
    if (!duration) return
    setSelectedVerse(verses[verseIndex])
    setScreen('exercise')
    navigator.wakeLock
      ?.request('screen')
      .then((lock) => {
        wakeLockRef.current = lock
      })
      .catch(() => {})
    startTimer(duration * 60, 0)
  }

  const handlePause = () => {
    cancelAnimationFrame(rafRef.current)
    elapsedBeforePauseRef.current =
      (performance.now() - startTimeRef.current) / 1000
    setIsPaused(true)
  }

  const handleResume = () => {
    setIsPaused(false)
    startTimer(totalDurationRef.current, elapsedBeforePauseRef.current)
  }

  if (screen === 'complete') {
    return (
      <Layout hero={<PageHero title="Scripture Soaking" />}>
        <CompletionScreen
          ctas={[
            { label: 'Try a different meditation', to: '/daily?tab=meditate', primary: true },
            { label: 'Continue to Pray \u2192', to: '/daily?tab=pray' },
            { label: 'Continue to Journal \u2192', to: '/daily?tab=journal' },
            { label: 'Visit the Prayer Wall \u2192', to: '/prayer-wall' },
          ]}
        />
      </Layout>
    )
  }

  if (screen === 'exercise' && selectedVerse) {
    return (
      <Layout hero={<PageHero title="Scripture Soaking" />}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-10 text-center">
          <blockquote className="mx-auto max-w-2xl font-serif text-2xl leading-relaxed text-text-dark sm:text-3xl lg:text-4xl">
            &ldquo;{selectedVerse.text}&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-text-light">
            {selectedVerse.reference} WEB
          </p>

          <button
            type="button"
            onClick={isPaused ? handleResume : handlePause}
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-text-dark transition-colors hover:bg-gray-100"
            aria-label={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>

        {/* Progress bar */}
        <div
          className="fixed bottom-0 left-0 right-0 h-1 bg-gray-200"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Soaking timer progress"
        >
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </Layout>
    )
  }

  // Pre-start
  return (
    <Layout hero={<PageHero title="Scripture Soaking" subtitle="Sit quietly with a single verse. No analyzing — just being present with God's word." />}>
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">

        <div className="mb-6 text-center">
          <button
            type="button"
            onClick={handleTryAnother}
            className="text-sm text-primary underline transition-colors hover:text-primary-light"
          >
            Try another verse
          </button>
        </div>

        {/* Duration selector */}
        <div className="mb-8">
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
