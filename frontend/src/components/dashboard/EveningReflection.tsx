import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, X, Check, Heart } from 'lucide-react'
import { KaraokeTextReveal } from '@/components/daily/KaraokeTextReveal'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { containsCrisisKeyword } from '@/constants/crisis-resources'
import { MOOD_OPTIONS } from '@/constants/dashboard/mood'
import { ACTIVITY_DISPLAY_NAMES } from '@/constants/dashboard/activity-points'
import { getEveningPrayer, getEveningVerse } from '@/constants/dashboard/evening-reflection'
import { getDayOfYear } from '@/constants/dashboard/ai-insights'
import { getTodayGratitude, saveGratitudeEntry } from '@/services/gratitude-storage'
import { markReflectionDone } from '@/services/evening-reflection-storage'
import { saveMoodEntry } from '@/services/mood-storage'
import { getLocalDateString } from '@/utils/date'
import { cn } from '@/lib/utils'
import type { MoodOption } from '@/constants/dashboard/mood'
import type { ActivityType, MoodEntry } from '@/types/dashboard'

interface EveningReflectionProps {
  onComplete: () => void
  onDismiss: () => void
  todayActivities: Record<ActivityType, boolean>
  todayPoints: number
  currentStreak: number
  recordActivity: (type: ActivityType) => void
}

type ReflectionStep = 1 | 2 | 3 | 4
type Step4Phase = 'prayer' | 'verse_reveal' | 'done'

const HIGHLIGHT_MAX_LENGTH = 500

const FIELD_1_PLACEHOLDERS = [
  "A person I'm thankful for...",
  'Something that made me smile...',
  'A blessing I noticed today...',
]

const FIELD_2_PLACEHOLDERS = [
  'A moment of peace today...',
  'Something I learned...',
  'A prayer God answered...',
]

const FIELD_3_PLACEHOLDERS = [
  'Something beautiful I saw...',
  'A way God showed up...',
  "Something I don't want to forget...",
]

function NumberedHeart({ number }: { number: number }) {
  return (
    <span className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center" aria-hidden="true">
      <Heart className="absolute h-5 w-5 fill-pink-400/20 text-pink-400" />
      <span className="relative text-xs font-bold text-pink-400">{number}</span>
    </span>
  )
}

export function EveningReflection({
  onComplete,
  onDismiss,
  todayActivities,
  todayPoints,
  currentStreak,
  recordActivity,
}: EveningReflectionProps) {
  const [currentStep, setCurrentStep] = useState<ReflectionStep>(1)
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [highlightText, setHighlightText] = useState('')
  const [gratitudeValues, setGratitudeValues] = useState<[string, string, string]>(['', '', ''])
  const [step4Phase, setStep4Phase] = useState<Step4Phase>('prayer')
  const [existingGratitude, setExistingGratitude] = useState<string[] | null>(null)
  const [showCrisisStep2, setShowCrisisStep2] = useState(false)
  const [showCrisisStep3, setShowCrisisStep3] = useState(false)

  const capturedDate = useMemo(() => getLocalDateString(), [])
  const moodGroupRef = useRef<HTMLDivElement>(null)

  // Check for existing gratitude when entering Step 3
  useEffect(() => {
    if (currentStep === 3) {
      const existing = getTodayGratitude()
      if (existing) {
        setExistingGratitude(existing.items)
      }
    }
  }, [currentStep])

  // Crisis detection for step 2
  useEffect(() => {
    setShowCrisisStep2(highlightText.trim().length > 0 && containsCrisisKeyword(highlightText))
  }, [highlightText])

  // Crisis detection for step 3
  useEffect(() => {
    const combined = gratitudeValues.join(' ')
    setShowCrisisStep3(combined.trim().length > 0 && containsCrisisKeyword(combined))
  }, [gratitudeValues])

  const handleMoodSelect = useCallback((mood: MoodOption, index: number) => {
    setSelectedMood(mood)
    setFocusedIndex(index)
    setCurrentStep(2)
  }, [])

  const handleMoodKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev + 1) % MOOD_OPTIONS.length)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev - 1 + MOOD_OPTIONS.length) % MOOD_OPTIONS.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const mood = MOOD_OPTIONS[focusedIndex]
      handleMoodSelect(mood, focusedIndex)
    }
  }, [focusedIndex, handleMoodSelect])

  // Focus management for mood orbs
  useEffect(() => {
    if (currentStep === 1) {
      const group = moodGroupRef.current
      if (!group) return
      const buttons = group.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      buttons[focusedIndex]?.focus()
    }
  }, [focusedIndex, currentStep])

  const handleStep2Next = () => {
    setCurrentStep(3)
  }

  const handleStep3Next = () => {
    // Save new gratitude if entered (and none existed before)
    if (!existingGratitude) {
      const nonEmpty = gratitudeValues.filter((v) => v.trim().length > 0)
      if (nonEmpty.length > 0) {
        saveGratitudeEntry(gratitudeValues)
        recordActivity('gratitude')
      }
    }
    setCurrentStep(4)
  }

  const handleGoodnight = () => {
    setStep4Phase('verse_reveal')
  }

  const handleVerseRevealComplete = () => {
    setStep4Phase('done')
  }

  const finishReflection = useCallback(() => {
    if (!selectedMood) return
    // 1. Mark reflection done
    markReflectionDone()
    // 2. Record activity
    recordActivity('reflection')
    // 3. Save evening mood entry
    const verse = getEveningVerse()
    const eveningEntry: MoodEntry = {
      id: crypto.randomUUID(),
      date: capturedDate,
      mood: selectedMood.value,
      moodLabel: selectedMood.label,
      text: highlightText.trim() || undefined,
      timestamp: Date.now(),
      verseSeen: verse.reference,
      timeOfDay: 'evening',
    }
    saveMoodEntry(eveningEntry)
    // 4. Close overlay
    onComplete()
  }, [selectedMood, capturedDate, highlightText, recordActivity, onComplete])

  const handleDismiss = useCallback(() => {
    markReflectionDone()
    onDismiss()
  }, [onDismiss])

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as ReflectionStep)
    }
  }

  const completedActivities = Object.entries(todayActivities)
    .filter(([key, val]) => val === true && key !== 'reflection')
    .map(([key]) => key as ActivityType)

  const prayer = getEveningPrayer()
  const verse = getEveningVerse()

  // Gratitude placeholders (rotating day-of-year)
  const placeholderIndex = getDayOfYear() % 3
  const gratitudePlaceholders = [
    FIELD_1_PLACEHOLDERS[placeholderIndex],
    FIELD_2_PLACEHOLDERS[placeholderIndex],
    FIELD_3_PLACEHOLDERS[placeholderIndex],
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evening-reflection-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]"
    >
      <div className="flex h-full w-full max-w-[640px] flex-col px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between pt-4">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="min-h-[44px] min-w-[44px] rounded-lg text-white/60 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              aria-label="Go back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="min-h-[44px] min-w-[44px]" />
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-[44px] min-w-[44px] rounded-lg text-white/50 transition-colors hover:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Close reflection"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto" aria-live="polite">
          {currentStep === 1 && (
            <div className="w-full text-center motion-safe:animate-fade-in">
              <h2
                id="evening-reflection-heading"
                className="mb-8 font-serif text-2xl text-white/90 md:text-3xl"
              >
                How has your day been?
              </h2>
              <div
                ref={moodGroupRef}
                role="radiogroup"
                aria-label="Select your evening mood"
                onKeyDown={handleMoodKeyDown}
                className="flex flex-wrap justify-center gap-3 sm:gap-4"
              >
                {MOOD_OPTIONS.map((mood, index) => {
                  const isSelected = selectedMood?.value === mood.value
                  const hasSelection = selectedMood !== null
                  return (
                    <button
                      key={mood.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={mood.label}
                      tabIndex={focusedIndex === index ? 0 : -1}
                      onClick={() => handleMoodSelect(mood, index)}
                      className={cn(
                        'flex flex-col items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:rounded-xl',
                        hasSelection && !isSelected && 'opacity-30',
                        isSelected && 'scale-[1.15]',
                        !hasSelection && 'motion-safe:animate-mood-pulse',
                      )}
                    >
                      <div
                        className="h-14 w-14 rounded-full sm:h-[60px] sm:w-[60px] lg:h-16 lg:w-16"
                        style={{
                          backgroundColor: isSelected ? mood.color : `${mood.color}33`,
                          boxShadow: isSelected ? `0 0 20px ${mood.color}, 0 0 40px ${mood.color}66` : 'none',
                        }}
                      />
                      <span className="text-xs text-white/70">{mood.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="w-full motion-safe:animate-fade-in">
              <h2
                id="evening-reflection-heading"
                className="mb-6 text-center font-serif text-2xl text-white/90 md:text-3xl"
              >
                Today&apos;s Highlights
              </h2>

              {/* Activity summary */}
              {completedActivities.length > 0 && (
                <div className="mb-4 space-y-2">
                  {completedActivities.map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      <span className="text-sm text-white/80">{ACTIVITY_DISPLAY_NAMES[type]}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Points and streak */}
              <div className="mb-6 flex items-center gap-4 text-sm text-white/70">
                <span>
                  <span className="font-semibold text-white">{todayPoints}</span> faith points earned today
                </span>
                {currentStreak > 0 && (
                  <span>
                    <span role="img" aria-label="fire">🔥</span> Day {currentStreak} streak
                  </span>
                )}
              </div>

              {/* Textarea */}
              <textarea
                value={highlightText}
                onChange={(e) => setHighlightText(e.target.value)}
                maxLength={HIGHLIGHT_MAX_LENGTH}
                placeholder="What was the best part of your day?"
                className="mb-2 h-28 w-full resize-none rounded-xl border border-white/15 bg-white/5 p-4 text-white placeholder:text-white/50 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Today's highlights"
                aria-describedby="evening-char-count"
              />
              <div className="mb-4 text-right">
                <CharacterCount current={highlightText.length} max={500} warningAt={400} dangerAt={480} visibleAt={300} id="evening-char-count" />
              </div>

              {showCrisisStep2 && <CrisisBanner text={highlightText} />}

              <button
                type="button"
                onClick={handleStep2Next}
                className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dashboard-dark sm:w-auto sm:px-8"
              >
                Next
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="w-full motion-safe:animate-fade-in">
              <h2
                id="evening-reflection-heading"
                className="mb-6 text-center font-serif text-2xl text-white/90 md:text-3xl"
              >
                Gratitude Moment
              </h2>

              {existingGratitude ? (
                <div className="mb-6">
                  <p className="mb-3 text-sm text-white/60">You already counted your blessings today</p>
                  <div className="space-y-2">
                    {existingGratitude.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        <span className="text-sm text-white/80">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-6 space-y-3">
                  {([0, 1, 2] as const).map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <NumberedHeart number={i + 1} />
                      <input
                        type="text"
                        value={gratitudeValues[i]}
                        onChange={(e) => {
                          const next = [...gratitudeValues] as [string, string, string]
                          next[i] = e.target.value
                          setGratitudeValues(next)
                        }}
                        maxLength={150}
                        placeholder={gratitudePlaceholders[i]}
                        className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/50 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        aria-label={`Gratitude item ${i + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {showCrisisStep3 && <CrisisBanner text={gratitudeValues.join(' ')} />}

              <button
                type="button"
                onClick={handleStep3Next}
                className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dashboard-dark sm:w-auto sm:px-8"
              >
                Next
              </button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="w-full text-center motion-safe:animate-fade-in">
              <h2
                id="evening-reflection-heading"
                className="mb-6 font-serif text-2xl text-white/90 md:text-3xl"
              >
                Closing Prayer
              </h2>

              {step4Phase === 'prayer' && (
                <>
                  <p className="mx-auto mb-8 max-w-lg font-serif text-lg italic leading-relaxed text-white/90 md:text-xl">
                    {prayer.text}
                  </p>
                  <button
                    type="button"
                    onClick={handleGoodnight}
                    className="rounded-lg bg-indigo-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-dashboard-dark"
                  >
                    Goodnight
                  </button>
                </>
              )}

              {step4Phase === 'verse_reveal' && (
                <div className="mx-auto max-w-lg">
                  <p className="font-serif text-lg italic leading-relaxed text-white/90 md:text-xl">
                    &ldquo;
                    <KaraokeTextReveal
                      text={verse.text}
                      revealDuration={2500}
                      onRevealComplete={handleVerseRevealComplete}
                      className="inline"
                    />
                    &rdquo;
                  </p>
                </div>
              )}

              {step4Phase === 'done' && (
                <div className="motion-safe:animate-fade-in">
                  <p className="mb-2 font-serif text-lg italic leading-relaxed text-white/90 md:text-xl">
                    &ldquo;{verse.text}&rdquo;
                  </p>
                  <p className="mb-8 text-sm text-white/50">— {verse.reference}</p>
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={finishReflection}
                      className="w-full rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dashboard-dark sm:w-auto"
                    >
                      Done
                    </button>
                    <Link
                      to="/music?tab=sleep"
                      onClick={finishReflection}
                      className="w-full rounded-lg border border-white/20 px-8 py-3 text-center font-semibold text-white transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-dashboard-dark sm:w-auto"
                    >
                      Go to Sleep &amp; Rest
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 pb-8 pt-4" aria-label={`Step ${currentStep} of 4`}>
          {([1, 2, 3, 4] as const).map((step) => (
            <div
              key={step}
              className={cn(
                'h-2 w-2 rounded-full',
                step === currentStep ? 'bg-white' : 'border border-white/30',
              )}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
