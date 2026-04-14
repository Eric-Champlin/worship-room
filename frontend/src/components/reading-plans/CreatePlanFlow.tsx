import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Layers, Sparkles, Sunrise, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { useToast } from '@/components/ui/Toast'
import { matchPlanByKeywords } from '@/utils/plan-matcher'
import { addCustomPlanId } from '@/utils/custom-plans-storage'
import { cn } from '@/lib/utils'

const CREATION_BG_STYLE = {
  backgroundImage:
    'radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)',
  backgroundSize: '100% 100%',
} as const

const TOPIC_CHIPS = [
  { label: 'Anxiety', starter: "I've been feeling anxious about..." },
  { label: 'Grief', starter: "I'm grieving the loss of..." },
  { label: 'Relationship struggles', starter: "I'm struggling in my relationship with..." },
  { label: 'Finding purpose', starter: "I've been searching for my purpose because..." },
  { label: 'Strengthening faith', starter: 'I want to grow deeper in my faith because...' },
  { label: 'Forgiveness', starter: "I'm trying to forgive..." },
] as const

interface DurationOption {
  days: number
  label: string
  description: string
  icon: LucideIcon
}

const DURATION_OPTIONS: DurationOption[] = [
  { days: 7, label: 'Quick Focus', description: "A focused week to address what's on your heart", icon: Zap },
  { days: 14, label: 'Deeper Dive', description: 'Two weeks to explore and reflect more deeply', icon: Layers },
  { days: 21, label: 'Full Transformation', description: 'Three weeks to build lasting spiritual habits', icon: Sunrise },
]

interface CreatePlanFlowProps {
  onClose: () => void
}

export function CreatePlanFlow({ onClose }: CreatePlanFlowProps) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null!)

  const [step, setStep] = useState(1)
  const [topicText, setTopicText] = useState('')
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Escape key navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isGenerating) {
        if (step === 1) {
          onClose()
        } else if (step === 2) {
          setStep(1)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, isGenerating, onClose])

  const handleBack = useCallback(() => {
    if (isGenerating) return
    if (step === 1) {
      onClose()
    } else if (step === 2) {
      setStep(1)
    }
  }, [step, isGenerating, onClose])

  const handleChipClick = useCallback(
    (starter: string) => {
      setTopicText(starter)
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (el) {
          el.focus()
          el.setSelectionRange(starter.length, starter.length)
        }
      })
    },
    [],
  )

  const handleGenerate = useCallback(() => {
    setStep(3)
    setIsGenerating(true)

    setTimeout(() => {
      const planId = matchPlanByKeywords(topicText)
      addCustomPlanId(planId)
      navigate(`/reading-plans/${planId}`)
      showToast('Your personalized plan is ready!')
    }, 2500)
  }, [topicText, navigate, showToast])

  return (
    <div className="min-h-screen" style={CREATION_BG_STYLE}>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {/* Back button */}
        {!isGenerating && (
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Back
          </button>
        )}

        {/* Progress dots */}
        <div
          className="flex justify-center gap-2"
          role="group"
          aria-label={`Step ${step} of 3`}
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                n === step ? 'bg-primary' : 'bg-white/20',
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="mt-8">
          {step === 1 && (
            <StepOne
              topicText={topicText}
              onTopicChange={setTopicText}
              onChipClick={handleChipClick}
              onNext={() => setStep(2)}
              textareaRef={textareaRef}
            />
          )}

          {step === 2 && (
            <StepTwo
              selectedDuration={selectedDuration}
              onDurationChange={setSelectedDuration}
              onGenerate={handleGenerate}
            />
          )}

          {step === 3 && <StepThree />}
        </div>
      </div>
    </div>
  )
}

// --- Step 1 ---

function StepOne({
  topicText,
  onTopicChange,
  onChipClick,
  onNext,
  textareaRef,
}: {
  topicText: string
  onTopicChange: (text: string) => void
  onChipClick: (starter: string) => void
  onNext: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  return (
    <div>
      <h1 className="text-center font-script text-4xl text-white sm:text-5xl">
        What&apos;s on your heart?
      </h1>

      <div className="mx-auto mt-8 max-w-xl">
        <CrisisBanner text={topicText} />

        <textarea
          ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
          value={topicText}
          onChange={(e) => onTopicChange(e.target.value)}
          maxLength={500}
          placeholder="I'm struggling with anxiety about my job..."
          className="w-full resize-none rounded-xl border border-glow-cyan/30 bg-white/5 p-4 text-white backdrop-blur-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-[0_0_12px_2px_rgba(0,212,255,0.35),0_0_27px_5px_rgba(139,92,246,0.26)] min-h-[120px]"
          aria-label="What's on your heart"
          aria-describedby="plan-char-count"
        />
        <div className="mt-2 text-right">
          <CharacterCount current={topicText.length} max={500} warningAt={400} dangerAt={480} visibleAt={300} id="plan-char-count" />
        </div>
      </div>

      {/* Topic chips */}
      <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
        {TOPIC_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onChipClick(chip.starter)}
            className="min-h-[44px] rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/15"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Next button */}
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onNext}
          disabled={!topicText.trim()}
          className={cn(
            'min-h-[44px] w-full rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors sm:w-auto',
            topicText.trim()
              ? 'hover:bg-primary-lt'
              : 'cursor-not-allowed opacity-50',
          )}
        >
          Next
        </button>
      </div>
    </div>
  )
}

// --- Step 2 ---

function StepTwo({
  selectedDuration,
  onDurationChange,
  onGenerate,
}: {
  selectedDuration: number | null
  onDurationChange: (days: number) => void
  onGenerate: () => void
}) {
  return (
    <div>
      <h1 className="text-center font-script text-4xl text-white sm:text-5xl">
        How long of a journey?
      </h1>

      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-4 sm:flex-row">
        {DURATION_OPTIONS.map(({ days, label, description, icon: Icon }) => (
          <button
            key={days}
            type="button"
            onClick={() => onDurationChange(days)}
            aria-pressed={selectedDuration === days}
            className={cn(
              'min-h-[44px] w-full rounded-xl border bg-white/5 p-5 text-left transition-all motion-reduce:transition-none sm:flex-1',
              selectedDuration === days
                ? 'border-primary shadow-[0_0_15px_rgba(109,40,217,0.3)]'
                : 'border-white/10 hover:bg-white/10',
            )}
          >
            <Icon className="h-6 w-6 text-primary-lt" />
            <p className="mt-3 text-base font-bold text-white">{label}</p>
            <p className="mt-1 text-sm text-white/50">{days} days</p>
            <p className="mt-2 text-sm text-white/60">{description}</p>
          </button>
        ))}
      </div>

      {/* Generate button */}
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!selectedDuration}
          className={cn(
            'min-h-[44px] w-full rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors sm:w-auto',
            selectedDuration
              ? 'hover:bg-primary-lt'
              : 'cursor-not-allowed opacity-50',
          )}
        >
          <Sparkles className="mr-2 inline-block h-4 w-4" aria-hidden="true" />
          Generate My Plan
        </button>
      </div>
    </div>
  )
}

// --- Step 3 ---

function StepThree() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" aria-live="polite">
      {/* Bouncing dots */}
      <div className="flex gap-2">
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary motion-reduce:animate-none [animation-delay:0ms]" />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary motion-reduce:animate-none [animation-delay:150ms]" />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary motion-reduce:animate-none [animation-delay:300ms]" />
      </div>

      <p className="mt-6 text-lg text-white/80">
        Creating a Scripture journey just for you...
      </p>

      <blockquote className="mt-8 max-w-md font-serif text-base italic leading-relaxed text-white/60">
        &ldquo;For I know the thoughts that I think toward you,&rdquo; says Yahweh, &ldquo;thoughts of peace, and not of evil, to give you hope and a future.&rdquo;
      </blockquote>
      <p className="mt-2 text-sm text-white/60">— Jeremiah 29:11 WEB</p>
    </div>
  )
}
