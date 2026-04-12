import { useState, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { CompletionScreen } from '@/components/daily/CompletionScreen'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { saveMeditationSession, getMeditationMinutesForWeek } from '@/services/meditation-storage'
import { getLocalDateString } from '@/utils/date'
import { SEO } from '@/components/SEO'
import { MEDITATE_ACTS_METADATA } from '@/lib/seo/routeMetadata'
import { AmbientSoundPill } from '@/components/daily/AmbientSoundPill'
import { getACTSSteps } from '@/mocks/daily-experience-mock-data'
import type { MeditationVerseContext } from '@/types/meditation'

export function ActsPrayerWalk() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/daily?tab=meditate" replace state={{ authRedirectMessage: 'Sign in to access guided meditations.' }} />
  return <ActsPrayerWalkContent />
}

function ActsPrayerWalkContent() {
  const location = useLocation()
  const meditationVerseContext = (location.state as { meditationVerseContext?: MeditationVerseContext } | null)?.meditationVerseContext ?? null
  const steps = getACTSSteps()
  const [currentStep, setCurrentStep] = useState(0)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [showNotes, setShowNotes] = useState<Record<number, boolean>>({})
  const [isComplete, setIsComplete] = useState(false)
  const [sessionDuration, setSessionDuration] = useState<number | null>(null)
  const { markMeditationComplete } = useCompletionTracking()
  const { recordActivity } = useFaithPoints()
  const startTimeRef = useRef(Date.now())

  const handleComplete = () => {
    const elapsedMs = Date.now() - startTimeRef.current
    const minutes = Math.max(1, Math.round(elapsedMs / 60000))
    markMeditationComplete('acts')
    recordActivity('meditate')
    setSessionDuration(minutes)
    saveMeditationSession({
      id: crypto.randomUUID(),
      type: 'acts',
      date: getLocalDateString(),
      durationMinutes: minutes,
      completedAt: new Date().toISOString(),
      ...(meditationVerseContext && { verseContext: meditationVerseContext }),
    })
    setIsComplete(true)
  }

  if (isComplete) {
    const weeklyTotal = getMeditationMinutesForWeek()
    return (
      <Layout hero={<PageHero title="ACTS Prayer Walk" scriptWord="Walk" />}>
        {sessionDuration !== null && (
          <div className="mx-auto max-w-lg motion-safe:animate-fade-in px-4 pt-10 text-center">
            <p className="font-serif text-lg text-text-dark">
              You meditated for {sessionDuration} {sessionDuration === 1 ? 'minute' : 'minutes'}
            </p>
            <p className="mt-1 text-sm text-text-light">
              {weeklyTotal === sessionDuration
                ? 'Your first meditation this week \u2014 great start!'
                : `Total this week: ${weeklyTotal} ${weeklyTotal === 1 ? 'minute' : 'minutes'}`}
            </p>
          </div>
        )}
        <CompletionScreen
          showMeditationStats
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

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1

  return (
    <Layout hero={<PageHero title="ACTS Prayer Walk" scriptWord="Walk" />}>
      <SEO {...MEDITATE_ACTS_METADATA} />
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <AmbientSoundPill context="other-meditation" />

        {/* Progress indicator */}
        <p className="mb-6 text-center text-sm font-medium text-text-light">
          Step {currentStep + 1} of {steps.length}: {step.title}
        </p>

        {/* Progress bar */}
        <div
          className="mb-8 h-1.5 rounded-full bg-gray-200"
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Step ${currentStep + 1} of ${steps.length}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
            }}
          />
        </div>

        <h2 className="mb-4 text-center text-2xl font-bold text-text-dark">
          {step.title}
        </h2>

        <p className="mb-6 text-center text-lg leading-relaxed text-text-light">
          {step.prompt}
        </p>

        {/* Supporting verse */}
        <div className="mb-6 rounded-lg bg-primary/5 p-4">
          <blockquote className="font-serif text-base italic text-text-dark">
            &ldquo;{step.verse.text}&rdquo;
          </blockquote>
          <p className="mt-2 text-sm text-text-light">
            {step.verse.reference} WEB
          </p>
        </div>

        {/* Optional notes */}
        {!showNotes[currentStep] ? (
          <button
            type="button"
            onClick={() =>
              setShowNotes((prev) => ({ ...prev, [currentStep]: true }))
            }
            className="mb-6 text-sm text-primary underline transition-colors hover:text-primary-light"
          >
            Add a note
          </button>
        ) : (
          <textarea
            value={notes[currentStep] || ''}
            onChange={(e) =>
              setNotes((prev) => ({ ...prev, [currentStep]: e.target.value }))
            }
            placeholder="Your thoughts..."
            className="mb-6 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-text-dark placeholder:text-text-light/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={3}
            aria-label={`Notes for ${step.title}`}
          />
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-text-dark transition-colors hover:bg-gray-50 disabled:opacity-50"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={handleComplete}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              Finish
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentStep((s) => Math.min(steps.length - 1, s + 1))
                }
                className="inline-flex items-center gap-1 text-sm text-text-light transition-colors hover:text-text-dark"
                aria-label="Skip to next step"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentStep((s) => Math.min(steps.length - 1, s + 1))
                }
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
                aria-label="Next step"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
