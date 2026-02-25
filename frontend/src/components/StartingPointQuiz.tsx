import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'
import {
  QUIZ_QUESTIONS,
  calculateResult,
} from '@/components/quiz-data'

function BackgroundSquiggle() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 1350"
      preserveAspectRatio="none"
      fill="none"
    >
      {/* Wide central brushstroke */}
      <path
        d="M400,0 C550,50 300,120 500,200 C700,280 250,370 500,450 C750,530 300,620 550,700 C800,780 350,870 500,960 C650,1050 350,1140 500,1230 L500,1350"
        stroke="#D6D3D1"
        strokeWidth="100"
        strokeLinecap="round"
        opacity="0.25"
      />
      {/* Right sweeping stroke */}
      <path
        d="M700,0 C850,80 600,170 800,260 C1000,350 650,440 850,530 C1050,620 700,710 900,800 C1100,890 750,960 900,1050 C1050,1140 800,1230 950,1350"
        stroke="#D6D3D1"
        strokeWidth="80"
        strokeLinecap="round"
        opacity="0.18"
      />
      {/* Left sweeping stroke */}
      <path
        d="M200,50 C350,130 100,220 300,310 C500,400 150,490 350,580 C550,670 200,760 350,850 C500,940 250,1030 350,1120 C500,1210 250,1280 350,1350"
        stroke="#E7E5E4"
        strokeWidth="90"
        strokeLinecap="round"
        opacity="0.22"
      />
      {/* Thin central accent for depth */}
      <path
        d="M550,20 C700,100 400,190 600,280 C800,370 450,460 650,550 C850,640 500,730 680,820 C860,910 550,1000 680,1090 C810,1180 550,1270 650,1350"
        stroke="#D6D3D1"
        strokeWidth="30"
        strokeLinecap="round"
        opacity="0.15"
      />
      {/* Far-left thin accent */}
      <path
        d="M80,80 C200,160 0,250 150,340 C300,430 50,520 200,610 C350,700 100,790 200,880 C300,970 100,1060 200,1150 C300,1240 120,1300 200,1350"
        stroke="#E7E5E4"
        strokeWidth="45"
        strokeLinecap="round"
        opacity="0.15"
      />
      {/* Far-right thin accent */}
      <path
        d="M1000,30 C1120,110 900,200 1050,290 C1200,380 950,470 1080,560 C1210,650 980,740 1080,830 C1180,920 1000,1010 1080,1100 C1180,1190 1000,1280 1080,1350"
        stroke="#E7E5E4"
        strokeWidth="45"
        strokeLinecap="round"
        opacity="0.15"
      />
    </svg>
  )
}

export function StartingPointQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => Array(QUIZ_QUESTIONS.length).fill(null) as (number | null)[]
  )
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [sectionRef, inView] = useInView<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  })

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
    document
      .getElementById('journey-heading')
      ?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const showResult = currentQuestion >= QUIZ_QUESTIONS.length
  const destination = showResult ? calculateResult(answers) : null

  return (
    <section id="quiz" aria-labelledby="quiz-heading">
      {/* Gradient transition from GrowthTeasers dark purple into white */}
      <div
        className="h-32 sm:h-40"
        style={{
          background: 'linear-gradient(to bottom, #251248 0%, #FFFFFF 100%)',
        }}
      />

      {/* White content area */}
      <div className="relative bg-white px-4 pt-12 pb-20 sm:px-6 sm:pt-16 sm:pb-24">
        {/* Background squiggles — width-constrained to match JourneySection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-2xl -translate-x-1/2"
          style={{
            maskImage:
              'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
          }}
        >
          <BackgroundSquiggle />
        </div>

        <div
          ref={sectionRef}
          className={cn(
            'relative mx-auto max-w-5xl transition-all duration-700 ease-out',
            inView
              ? 'translate-y-0 opacity-100'
              : 'translate-y-8 opacity-0'
          )}
        >
          {/* Section heading */}
          <div className="mb-10 text-center sm:mb-12">
            <h2
              id="quiz-heading"
              className="mb-3 font-sans text-[1.7rem] font-bold text-text-dark sm:text-[2.1rem] lg:text-[2.625rem]"
            >
              Not Sure Where to{' '}
              <span className="font-script text-4xl text-primary sm:text-5xl lg:text-6xl">
                Start?
              </span>
            </h2>
            <p className="text-base text-text-dark sm:text-lg">
              Take a 30-second quiz and we&apos;ll point you in the right
              direction.
            </p>
          </div>

          {/* Quiz card */}
          <div className="relative mx-auto max-w-[600px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
            {/* Progress bar — hidden on result */}
            {!showResult && (
              <div>
                <div className="h-1.5 w-full bg-gray-100">
                  <div
                    role="progressbar"
                    aria-valuenow={(currentQuestion + 1) * 20}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Quiz progress"
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${(currentQuestion + 1) * 20}%`,
                      transition: 'width 300ms ease',
                    }}
                  />
                </div>
                <p className="mt-3 mb-2 text-center text-sm text-text-light">
                  Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
                </p>
              </div>
            )}

            {/* Content area with slide animation */}
            <div className="relative overflow-hidden">
              <div
                key={currentQuestion}
                className={
                  slideDirection === 'left'
                    ? 'animate-slide-from-right'
                    : 'animate-slide-from-left'
                }
              >
                {showResult && destination ? (
                  <ResultCard
                    destination={destination}
                    onRetake={handleRetake}
                    onExploreAll={handleExploreAll}
                  />
                ) : (
                  <QuestionCard
                    questionIndex={currentQuestion}
                    selectedAnswer={answers[currentQuestion]}
                    onSelect={handleSelect}
                    onBack={handleBack}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}

interface QuestionCardProps {
  questionIndex: number
  selectedAnswer: number | null
  onSelect: (optionIndex: number) => void
  onBack: () => void
}

function QuestionCard({
  questionIndex,
  selectedAnswer,
  onSelect,
  onBack,
}: QuestionCardProps) {
  const question = QUIZ_QUESTIONS[questionIndex]

  return (
    <div>
      {/* Back button */}
      <div className="px-6 pt-4">
        {questionIndex > 0 ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-text-light transition-colors hover:text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
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
      <h3 className="mb-4 px-6 pt-2 text-lg font-semibold text-text-dark sm:mb-6">
        {question.question}
      </h3>

      {/* Answer options */}
      <div className="flex flex-col gap-3 px-6 pb-6">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          return (
            <button
              key={index}
              onClick={() => onSelect(index)}
              aria-pressed={isSelected}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm transition-all duration-200 sm:text-base',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected
                  ? 'border-primary bg-[#8B5CF620]'
                  : 'border-gray-200 bg-gray-50 hover:border-primary/30 hover:bg-primary/5'
              )}
            >
              <span>{option.label}</span>
              {isSelected && (
                <Check
                  className="h-5 w-5 flex-shrink-0 text-primary"
                  aria-hidden="true"
                />
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
}

function ResultCard({ destination, onRetake, onExploreAll }: ResultCardProps) {
  return (
    <div className="text-center">
      <h3 className="px-6 pt-6 text-xl font-bold text-text-dark">
        We&apos;d recommend starting with {destination.name}
      </h3>

      <p className="mt-3 px-6 text-text-light">{destination.description}</p>

      <blockquote className="mt-4 px-6 font-serif italic text-text-dark">
        &ldquo;{destination.verse}&rdquo;
        <footer className="mt-1 font-sans text-sm not-italic text-text-light">
          &mdash; {destination.verseReference}
        </footer>
      </blockquote>

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

      <div className="mt-4">
        <button
          onClick={onExploreAll}
          className="text-sm text-text-dark transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
        >
          Or explore all features &uarr;
        </button>
      </div>

      <div className="mt-2 mb-6">
        <button
          onClick={onRetake}
          className="font-script text-base font-normal text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
        >
          Retake Quiz
        </button>
      </div>
    </div>
  )
}
