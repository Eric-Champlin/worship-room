import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { QUIZ_QUESTIONS, calculateResult } from '@/components/quiz-data'
import { KaraokeTextReveal } from '@/components/daily/KaraokeTextReveal'
import { WHITE_PURPLE_GRADIENT } from '@/constants/gradients'
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { SectionHeading } from '@/components/homepage/SectionHeading'
import { FrostedCard } from '@/components/homepage/FrostedCard'

interface StartingPointQuizProps {
  variant?: 'dark' | 'light'
}

export function StartingPointQuiz({ variant = 'dark' }: StartingPointQuizProps) {
  const isDark = variant === 'dark'
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => Array(QUIZ_QUESTIONS.length).fill(null) as (number | null)[]
  )
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { ref: sectionRef, isVisible } = useScrollReveal()

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleSelect = useCallback(
    (optionIndex: number) => {
      // Clear any pending auto-advance
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      setAnswers((prev) => {
        const next = [...prev]
        next[currentQuestion] = optionIndex
        return next
      })

      setSlideDirection('left')

      timeoutRef.current = setTimeout(() => {
        setCurrentQuestion((prev) => prev + 1)
      }, 400)
    },
    [currentQuestion]
  )

  const handleBack = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSlideDirection('right')
    setCurrentQuestion((prev) => prev - 1)
  }, [])

  const handleRetake = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSlideDirection('right')
    setAnswers(Array(QUIZ_QUESTIONS.length).fill(null) as (number | null)[])
    setCurrentQuestion(0)
  }, [])

  const handleExploreAll = useCallback(() => {
    const journeyEl = document.getElementById('journey-heading')
    if (journeyEl) {
      journeyEl.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const showResult = currentQuestion >= QUIZ_QUESTIONS.length
  const destination = showResult ? calculateResult(answers) : null

  const quizContent = (
    <>
      {/* Progress bar — hidden on result */}
      {!showResult && (
        <div>
          <div className={cn('w-full rounded-full', isDark ? 'h-1 bg-white/[0.06]' : 'h-1.5 bg-gray-100')}>
            <div
              role="progressbar"
              aria-valuenow={(currentQuestion + 1) * 20}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Quiz progress"
              className={cn(
                'h-full rounded-full',
                isDark
                  ? 'bg-gradient-to-r from-purple-500 to-white/80 transition-all duration-300 ease-out'
                  : 'bg-primary'
              )}
              style={{
                ...(!isDark && { transition: 'width 300ms ease' }),
                width: `${(currentQuestion + 1) * 20}%`,
              }}
            />
          </div>
          <p className={cn(
            'mb-2 mt-3 text-center text-sm',
            isDark ? 'text-white/50' : 'text-text-light'
          )}>
            Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
          </p>
        </div>
      )}

      {/* Content area with slide animation */}
      <div className="relative overflow-hidden">
        {showResult && destination ? (
          <div className="relative">
            {isDark && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[60px]"
                style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)' }}
              />
            )}
            <div
              key={currentQuestion}
              className={
                slideDirection === 'left' ? 'motion-safe:animate-slide-from-right' : 'motion-safe:animate-slide-from-left'
              }
            >
              {isDark ? (
                <FrostedCard>
                  <ResultCard
                    destination={destination}
                    onRetake={handleRetake}
                    onExploreAll={handleExploreAll}
                    isDark={isDark}
                  />
                </FrostedCard>
              ) : (
                <ResultCard
                  destination={destination}
                  onRetake={handleRetake}
                  onExploreAll={handleExploreAll}
                  isDark={isDark}
                />
              )}
            </div>
          </div>
        ) : (
          <div
            key={currentQuestion}
            className={
              slideDirection === 'left' ? 'motion-safe:animate-slide-from-right' : 'motion-safe:animate-slide-from-left'
            }
          >
            <QuestionCard
              questionIndex={currentQuestion}
              selectedAnswer={answers[currentQuestion]}
              onSelect={handleSelect}
              onBack={handleBack}
              isDark={isDark}
            />
          </div>
        )}
      </div>
    </>
  )

  return (
    <section id="quiz" aria-labelledby="quiz-heading">
      {isDark ? (
        <GlowBackground variant="right" className="py-20 sm:py-28">
          <div ref={sectionRef as React.RefObject<HTMLDivElement>} className="relative mx-auto max-w-5xl px-4 sm:px-6">
            <SectionHeading
              id="quiz-heading"
              heading="Not Sure Where to Start?"
              tagline="Take a 30-second quiz and we'll point you in the right direction."
              align="center"
              className={cn('scroll-reveal mb-10 sm:mb-12', isVisible && 'is-visible')}
            />
            <div
              className={cn('scroll-reveal', isVisible && 'is-visible')}
              style={staggerDelay(1, 200)}
            >
              {/* Frosted glass container */}
              <div className={cn(
                'relative mx-auto max-w-3xl',
                'bg-white/[0.04] backdrop-blur-sm border border-white/[0.10] rounded-3xl',
                'shadow-[0_0_30px_rgba(139,92,246,0.08),0_4px_25px_rgba(0,0,0,0.25)]',
                'p-6 sm:p-8 lg:p-10'
              )}>
                <div className="relative mx-auto max-w-[600px]">
                  {quizContent}
                </div>
              </div>
            </div>
          </div>
        </GlowBackground>
      ) : (
        <div className="bg-white px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20">
          <div ref={sectionRef as React.RefObject<HTMLDivElement>} className="relative mx-auto max-w-5xl">
            {/* Light variant heading */}
            <div className="mb-10 text-center sm:mb-12">
              <h2
                id="quiz-heading"
                className="mb-3 font-sans text-2xl font-bold text-text-dark sm:text-3xl lg:text-4xl"
              >
                Not Sure Where to{' '}
                <span className="font-script text-4xl text-primary sm:text-5xl lg:text-6xl">
                  Start?
                </span>
              </h2>
              <p className="text-base text-text-dark sm:text-lg">
                Take a 30-second quiz and we&apos;ll point you in the right direction.
              </p>
            </div>

            {/* Quiz card */}
            <div className="relative mx-auto max-w-[600px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
              {quizContent}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

interface QuestionCardProps {
  questionIndex: number
  selectedAnswer: number | null
  onSelect: (optionIndex: number) => void
  onBack: () => void
  isDark: boolean
}

function QuestionCard({ questionIndex, selectedAnswer, onSelect, onBack, isDark }: QuestionCardProps) {
  const question = QUIZ_QUESTIONS[questionIndex]

  return (
    <div>
      {/* Back button */}
      <div className="px-6 pt-4">
        {questionIndex > 0 ? (
          <button
            type="button"
            onClick={onBack}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1 text-sm transition-colors focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isDark
                ? 'text-white/50 hover:text-white'
                : 'text-text-light hover:text-text-dark'
            )}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
        ) : (
          // Invisible placeholder to maintain consistent spacing
          <div className="h-5" />
        )}
      </div>

      {/* Question text */}
      <h3 className={cn(
        'mb-4 px-6 pt-2 text-lg font-semibold sm:mb-6',
        isDark ? 'text-white' : 'text-text-dark'
      )}>
        {question.question}
      </h3>

      {/* Answer options */}
      <div className="flex flex-col gap-3 px-6 pb-6">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          return (
            <button
              type="button"
              key={index}
              onClick={() => onSelect(index)}
              aria-pressed={isSelected}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border text-left text-sm transition-all sm:text-base',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isDark
                  ? 'px-4 py-3 min-h-[44px] duration-150'
                  : 'p-4 duration-200',
                isDark ? 'text-white/70' : '',
                isSelected
                  ? isDark
                    ? 'bg-purple-500/20 border-purple-500/30 text-white'
                    : 'border-primary bg-[#8B5CF620]'
                  : isDark
                    ? 'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12]'
                    : 'border-gray-200 bg-gray-50 hover:border-primary/30 hover:bg-primary/5'
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
}

interface ResultCardProps {
  destination: {
    name: string
    route: string
    ctaLabel: string
    description: string
    verse: string
    verseReference: string
  }
  onRetake: () => void
  onExploreAll: () => void
  isDark: boolean
}

function ResultCard({ destination, onRetake, onExploreAll, isDark }: ResultCardProps) {
  const [referenceVisible, setReferenceVisible] = useState(false)

  return (
    <div className="text-center">
      <h3 className={cn('px-6 pt-6 text-xl font-bold', isDark ? 'text-white' : 'text-text-dark')}>
        We&apos;d recommend starting with {destination.name}
      </h3>

      <p className={cn('mt-3 px-6', isDark ? 'text-white/70' : 'text-text-light')}>
        {destination.description}
      </p>

      <blockquote className={cn('mt-4 px-6 font-serif italic', isDark ? 'text-white/80' : 'text-text-dark')}>
        &ldquo;<KaraokeTextReveal
          text={destination.verse}
          revealDuration={2000}
          onRevealComplete={() => setReferenceVisible(true)}
        />&rdquo;
        <cite
          className={cn(
            'mt-1 block font-sans text-sm not-italic transition-opacity duration-300',
            referenceVisible ? 'opacity-100' : 'opacity-0',
            isDark ? 'text-white/50' : 'text-text-light',
          )}
        >
          &mdash; {destination.verseReference}
        </cite>
      </blockquote>

      {isDark ? (
        <Link
          to={destination.route}
          className={cn(
            'mx-6 mt-6 inline-block rounded-full bg-white px-6 py-3 text-base font-semibold text-hero-bg',
            'transition-colors duration-200 hover:bg-white/90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
          )}
        >
          Go to {destination.ctaLabel}
        </Link>
      ) : (
        <Link
          to={destination.route}
          className={cn(
            'mx-6 mt-6 inline-block rounded-full bg-primary px-8 py-3 text-base font-medium text-white',
            'transition-all hover:bg-primary-lt hover:shadow-lg',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
          )}
        >
          Go to {destination.ctaLabel}
        </Link>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={onExploreAll}
          className={cn(
            'inline-flex min-h-[44px] items-center text-sm transition-colors focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            isDark
              ? 'text-white/70 hover:text-primary-lt'
              : 'text-text-dark hover:text-primary'
          )}
        >
          Or explore all features &uarr;
        </button>
      </div>

      <div className="mb-6 mt-2">
        {isDark ? (
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex min-h-[44px] items-center pb-1 font-script text-xl font-normal transition-colors hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              background: WHITE_PURPLE_GRADIENT,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Retake Quiz
          </button>
        ) : (
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex min-h-[44px] items-center font-script text-xl font-normal text-primary transition-colors hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Retake Quiz
          </button>
        )}
      </div>
    </div>
  )
}
