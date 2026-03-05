import { useState } from 'react'
import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { CompletionScreen } from '@/components/daily/CompletionScreen'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { getACTSSteps } from '@/mocks/daily-experience-mock-data'

export function ActsPrayerWalk() {
  const steps = getACTSSteps()
  const [currentStep, setCurrentStep] = useState(0)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [showNotes, setShowNotes] = useState<Record<number, boolean>>({})
  const [isComplete, setIsComplete] = useState(false)
  const { markMeditationComplete } = useCompletionTracking()

  const handleComplete = () => {
    markMeditationComplete('acts')
    setIsComplete(true)
  }

  if (isComplete) {
    return (
      <Layout hero={<PageHero title="ACTS Prayer Walk" />}>
        <CompletionScreen
          ctas={[
            { label: 'Try a different meditation', to: '/meditate', primary: true },
            { label: 'Continue to Pray \u2192', to: '/pray' },
            { label: 'Continue to Journal \u2192', to: '/journal' },
            { label: 'Visit the Prayer Wall \u2192', to: '/prayer-wall' },
          ]}
        />
      </Layout>
    )
  }

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1

  return (
    <Layout hero={<PageHero title="ACTS Prayer Walk" />}>
      <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">

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
