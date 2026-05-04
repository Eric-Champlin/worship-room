import { useState, useRef, useEffect, useCallback, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { setOnboardingComplete } from '@/services/onboarding-storage'
import { getSettings, updateSettings } from '@/services/settings-storage'
import {
  AVATAR_PRESETS,
  AVATAR_CATEGORIES,
  AVATAR_CATEGORY_LABELS,
  DEFAULT_AVATAR_ID,
} from '@/constants/dashboard/avatars'
import {
  QUIZ_QUESTIONS,
  calculateResult,
  type QuizDestination,
} from '@/components/quiz-data'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WelcomeWizardProps {
  userName: string
  onComplete: () => void
}

type WizardScreen = 0 | 1 | 2 | 3

// ---------------------------------------------------------------------------
// Heading IDs per screen (for aria-labelledby)
// ---------------------------------------------------------------------------

const HEADING_IDS: Record<WizardScreen, string> = {
  0: 'wizard-heading-welcome',
  1: 'wizard-heading-avatar',
  2: 'wizard-heading-quiz',
  3: 'wizard-heading-results',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WelcomeWizard({ userName, onComplete }: WelcomeWizardProps) {
  const navigate = useNavigate()
  const { simulateLegacyAuth } = useAuth()

  // ---- Wizard navigation state ----
  const [currentScreen, setCurrentScreen] = useState<WizardScreen>(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left')

  // ---- Screen 1: Name ----
  const [displayName, setDisplayName] = useState(userName)
  const [nameBlurred, setNameBlurred] = useState(false)
  const [nameAttemptedNext, setNameAttemptedNext] = useState(false)

  // ---- Screen 2: Avatar ----
  const [selectedAvatarId, setSelectedAvatarId] = useState(() => {
    const settings = getSettings()
    const id = settings.profile.avatarId
    return id === 'default' ? DEFAULT_AVATAR_ID : id
  })

  // ---- Screen 3: Quiz ----
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(
    () => new Array(QUIZ_QUESTIONS.length).fill(null),
  )
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0)
  const quizTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Screen 4: Results ----
  const [quizResult, setQuizResult] = useState<QuizDestination | null>(null)

  // ---- Focus management ----
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Focus heading on screen/question transitions
  useEffect(() => {
    // Small delay to allow the new DOM to render after key change
    const timer = setTimeout(() => {
      headingRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [currentScreen, currentQuizQuestion])

  // Cleanup quiz timeout on unmount
  useEffect(() => {
    return () => {
      if (quizTimeoutRef.current) clearTimeout(quizTimeoutRef.current)
    }
  }, [])

  // ---- Name validation ----
  const trimmedName = displayName.trim()
  const nameValid = trimmedName.length >= 2 && trimmedName.length <= 30
  const showNameError = !nameValid && (nameBlurred || nameAttemptedNext)

  // ---- Navigation helpers ----
  const goForward = useCallback((toScreen: WizardScreen) => {
    setSlideDirection('left')
    setCurrentScreen(toScreen)
  }, [])

  const goBackward = useCallback((toScreen: WizardScreen) => {
    setSlideDirection('right')
    setCurrentScreen(toScreen)
  }, [])

  // ---- Handlers ----
  const handleNext = () => {
    if (currentScreen === 0) {
      setNameAttemptedNext(true)
      if (!nameValid) return
      goForward(1)
    } else if (currentScreen === 1) {
      goForward(2)
    }
    // Screen 2 (quiz) has no Next button — auto-advance
    // Screen 3 (results) has its own CTA buttons
  }

  const handleBack = () => {
    if (currentScreen === 1) {
      goBackward(0)
    } else if (currentScreen === 2) {
      if (quizTimeoutRef.current) clearTimeout(quizTimeoutRef.current)
      if (currentQuizQuestion > 0) {
        setSlideDirection('right')
        setCurrentQuizQuestion((prev) => prev - 1)
      } else {
        goBackward(1)
      }
    } else if (currentScreen === 3) {
      setSlideDirection('right')
      setCurrentQuizQuestion(4) // Return to Q5
      setCurrentScreen(2)
    }
  }

  const handleQuizSelect = (optionIndex: number) => {
    if (quizTimeoutRef.current) clearTimeout(quizTimeoutRef.current)

    const updatedAnswers = [...quizAnswers]
    updatedAnswers[currentQuizQuestion] = optionIndex
    setQuizAnswers(updatedAnswers)

    quizTimeoutRef.current = setTimeout(() => {
      if (currentQuizQuestion < QUIZ_QUESTIONS.length - 1) {
        setSlideDirection('left')
        setCurrentQuizQuestion((prev) => prev + 1)
      } else {
        // Q5 answered — calculate result and advance to Screen 4
        setQuizResult(calculateResult(updatedAnswers))
        goForward(3)
      }
    }, 400)
  }

  const handleSkip = () => {
    setOnboardingComplete()
    // Do NOT save name or avatar changes
    onComplete()
  }

  const handleComplete = (destinationRoute?: string) => {
    // 1. Save display name via the legacy-mock helper.
    //    TODO(Phase 3): replace with real registration flow once onboarding
    //    collects email/password.
    simulateLegacyAuth(trimmedName)

    // 2. Save avatar selection
    updateSettings({ profile: { avatarId: selectedAvatarId } })

    // 3. Mark onboarding complete
    setOnboardingComplete()

    // 4. Navigate
    if (destinationRoute) {
      navigate(destinationRoute)
    } else {
      onComplete()
    }
  }

  // ---- Slide transition key ----
  const screenKey =
    currentScreen === 2 ? `quiz-${currentQuizQuestion}` : `screen-${currentScreen}`
  const slideClass =
    slideDirection === 'left'
      ? 'motion-safe:animate-slide-from-right motion-reduce:animate-none'
      : 'motion-safe:animate-slide-from-left motion-reduce:animate-none'

  // ---- Next button label / visibility ----
  const showNextButton = currentScreen === 0 || currentScreen === 1
  const nextLabel = 'Next'
  const nextDisabled = currentScreen === 0 && !nameValid
  const showBackButton = currentScreen > 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={HEADING_IDS[currentScreen]}
      className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-dashboard-dark motion-safe:animate-continue-fade-in motion-reduce:animate-none"
    >
      {/* Content card */}
      <div className="relative mx-4 w-full max-w-[560px] sm:max-w-[480px] lg:max-w-[560px]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6 lg:p-8">
          {/* Screen content with slide transition */}
          <div className="relative overflow-hidden">
            <div key={screenKey} className={slideClass}>
              {currentScreen === 0 && (
                <Screen1Welcome
                  ref={headingRef}
                  displayName={displayName}
                  onNameChange={setDisplayName}
                  onNameBlur={() => setNameBlurred(true)}
                  showNameError={showNameError}
                />
              )}
              {currentScreen === 1 && (
                <Screen2Avatar
                  ref={headingRef}
                  selectedAvatarId={selectedAvatarId}
                  onSelectAvatar={setSelectedAvatarId}
                />
              )}
              {currentScreen === 2 && (
                <Screen3Quiz
                  ref={headingRef}
                  currentQuestion={currentQuizQuestion}
                  answers={quizAnswers}
                  onSelect={handleQuizSelect}
                />
              )}
              {currentScreen === 3 && (
                <Screen4Results
                  ref={headingRef}
                  quizResult={quizResult}
                  onStartJourney={() => handleComplete(quizResult?.route)}
                  onExplore={() => handleComplete(undefined)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Navigation row — below card */}
        <div className="mt-6 flex items-center justify-between px-2">
          {/* Back button (left) */}
          <div className="w-20">
            {showBackButton && (
              <button
                type="button"
                onClick={handleBack}
                className="min-h-[44px] min-w-[44px] text-sm font-medium text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
              >
                Back
              </button>
            )}
          </div>

          {/* Dot indicator (center) */}
          <div className="flex items-center gap-2" aria-hidden="true">
            {([0, 1, 2, 3] as const).map((i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full transition-all motion-reduce:transition-none duration-base',
                  i === currentScreen
                    ? 'h-3 w-3 bg-primary'
                    : 'h-2 w-2 bg-white/30',
                )}
              />
            ))}
          </div>

          {/* Next button (right) */}
          <div className="w-20 text-right">
            {showNextButton && (
              <button
                type="button"
                onClick={handleNext}
                disabled={nextDisabled}
                className="min-h-[44px] rounded-lg bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                {nextLabel}
              </button>
            )}
          </div>
        </div>

        {/* Skip link — bottom */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleSkip}
            className="min-h-[44px] text-sm text-white/50 underline-offset-4 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// Screen 1 — Welcome
// ===========================================================================

interface Screen1Props {
  displayName: string
  onNameChange: (value: string) => void
  onNameBlur: () => void
  showNameError: boolean
}

const Screen1Welcome = forwardRef<HTMLHeadingElement, Screen1Props>(
  function Screen1Welcome({ displayName, onNameChange, onNameBlur, showNameError }, ref) {
    return (
      <div>
        <h2
          id="wizard-heading-welcome"
          ref={ref}
          tabIndex={-1}
          className="text-center bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-3xl font-bold outline-none sm:text-4xl"
        >
          Welcome to Worship Room
        </h2>
        <p className="mt-2 text-center text-base text-white/80 md:text-lg">
          A safe place to heal, grow, and connect with God
        </p>
        <div className="mt-8">
          <label htmlFor="wizard-name" className="mb-2 block text-sm text-white/70">
            What should we call you?
          </label>
          <input
            id="wizard-name"
            type="text"
            value={displayName}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameBlur}
            maxLength={30}
            placeholder="Your name"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            aria-invalid={showNameError ? 'true' : undefined}
            aria-describedby="wizard-name-error"
          />
          {showNameError && (
            <p id="wizard-name-error" className="mt-1 text-sm text-danger" role="alert">
              Name must be 2-30 characters
            </p>
          )}
        </div>
      </div>
    )
  },
)

// ===========================================================================
// Screen 2 — Avatar Selection
// ===========================================================================

interface Screen2Props {
  selectedAvatarId: string
  onSelectAvatar: (id: string) => void
}

const Screen2Avatar = forwardRef<HTMLHeadingElement, Screen2Props>(
  function Screen2Avatar({ selectedAvatarId, onSelectAvatar }, ref) {
    return (
      <div>
        <h2
          id="wizard-heading-avatar"
          ref={ref}
          tabIndex={-1}
          className="text-center text-xl font-bold text-white outline-none sm:text-2xl"
        >
          Choose Your Avatar
        </h2>
        <p className="mt-2 text-center text-base text-white/70">
          Pick an icon that speaks to you
        </p>

        <div className="mt-6 space-y-4" role="radiogroup" aria-label="Avatar selection">
          {AVATAR_CATEGORIES.map((category) => {
            const presetsInCategory = AVATAR_PRESETS.filter((p) => p.category === category)
            return (
              <div key={category}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  {AVATAR_CATEGORY_LABELS[category]}
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {presetsInCategory.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      role="radio"
                      aria-checked={selectedAvatarId === preset.id}
                      aria-label={preset.name}
                      onClick={() => onSelectAvatar(preset.id)}
                      className={cn(
                        'flex items-center justify-center rounded-full transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        'h-14 w-14 sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]',
                        selectedAvatarId === preset.id &&
                          'ring-2 ring-primary ring-offset-2 ring-offset-dashboard-dark',
                      )}
                      style={{ backgroundColor: preset.bgColor }}
                    >
                      <preset.icon
                        className="h-6 w-6 text-white sm:h-7 sm:w-7 lg:h-8 lg:w-8"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)

// ===========================================================================
// Screen 3 — Quiz
// ===========================================================================

interface Screen3Props {
  currentQuestion: number
  answers: (number | null)[]
  onSelect: (optionIndex: number) => void
}

const Screen3Quiz = forwardRef<HTMLHeadingElement, Screen3Props>(
  function Screen3Quiz({ currentQuestion, answers, onSelect }, ref) {
    const question = QUIZ_QUESTIONS[currentQuestion]
    return (
      <div>
        <h2
          id="wizard-heading-quiz"
          ref={ref}
          tabIndex={-1}
          className="text-center text-xl font-bold text-white outline-none sm:text-2xl"
        >
          What Brought You Here?
        </h2>
        <p className="mt-2 text-center text-base text-white/70">
          Help us point you in the right direction
        </p>

        <p className="mt-4 text-center text-sm text-white/50">
          Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
        </p>

        <h3 className="mb-4 mt-2 text-lg font-semibold text-white">
          {question.question}
        </h3>

        <div
          className="flex flex-col gap-3"
          role="radiogroup"
          aria-label={`Question ${currentQuestion + 1}`}
        >
          {question.options.map((option, index) => {
            const isSelected = answers[currentQuestion] === index
            return (
              <button
                type="button"
                key={index}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(index)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm text-white/80 transition-all motion-reduce:transition-none duration-base sm:text-base',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isSelected
                    ? 'border-primary bg-primary/20'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/15',
                )}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <Check className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  },
)

// ===========================================================================
// Screen 4 — Results
// ===========================================================================

interface Screen4Props {
  quizResult: QuizDestination | null
  onStartJourney: () => void
  onExplore: () => void
}

const Screen4Results = forwardRef<HTMLHeadingElement, Screen4Props>(
  function Screen4Results({ quizResult, onStartJourney, onExplore }, ref) {
    return (
      <div className="text-center">
        <h2
          id="wizard-heading-results"
          ref={ref}
          tabIndex={-1}
          className="bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-2xl font-bold outline-none sm:text-3xl"
        >
          You&rsquo;re All Set!
        </h2>

        {quizResult && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-left sm:p-6">
            <p className="text-base font-medium text-white sm:text-lg">
              We&rsquo;d recommend starting with{' '}
              <span className="font-semibold text-primary-lt">{quizResult.name}</span>
            </p>
            <p className="mt-3 text-sm text-white/70 sm:text-base">
              {quizResult.description}
            </p>
            <blockquote className="mt-4 font-serif italic text-white/80">
              &ldquo;{quizResult.verse}&rdquo;
              <cite className="mt-1 block font-sans text-sm not-italic text-white/50">
                &mdash; {quizResult.verseReference}
              </cite>
            </blockquote>
          </div>
        )}

        <button
          type="button"
          onClick={onStartJourney}
          className="mt-6 w-full rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark sm:w-auto"
        >
          Start Your Journey
        </button>

        <div className="mt-3">
          <button
            type="button"
            onClick={onExplore}
            className="min-h-[44px] text-sm text-white/60 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
          >
            Explore on your own
          </button>
        </div>
      </div>
    )
  },
)
