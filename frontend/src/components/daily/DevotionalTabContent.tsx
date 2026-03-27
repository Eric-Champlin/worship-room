import { useCallback, useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Share2, Volume2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
import { getTodaysDevotional, formatDevotionalDate } from '@/data/devotionals'
import { useSwipe } from '@/hooks/useSwipe'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { useReadAloud } from '@/hooks/useReadAloud'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { RelatedPlanCallout } from '@/components/devotional/RelatedPlanCallout'
import { useReadingPlanProgress } from '@/hooks/useReadingPlanProgress'
import { READING_PLANS } from '@/data/reading-plans'
import { VerseLink } from '@/components/shared/VerseLink'
import type { Devotional } from '@/types/devotional'

function buildReadAloudText(devotional: Devotional): string {
  const quoteText = devotional.quote.text
  const passageText = devotional.passage.verses.map((v) => v.text).join(' ')
  const reflectionText = devotional.reflection.join(' ')
  const prayerText = devotional.prayer
  const questionText = devotional.reflectionQuestion
  return `${quoteText} ${passageText} ${reflectionText} ${prayerText} ${questionText}`
}

interface DevotionalTabContentProps {
  onSwitchToJournal?: (topic: string) => void
  onSwitchToPray?: (context: string) => void
  onComplete?: () => void
}

export function DevotionalTabContent({
  onSwitchToJournal,
  onSwitchToPray,
  onComplete,
}: DevotionalTabContentProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const dayOffset = Math.max(-7, Math.min(0, Number(searchParams.get('day')) || 0))
  const devotional = getTodaysDevotional(new Date(), dayOffset)
  const dateStr = formatDevotionalDate(new Date(), dayOffset)
  const questionRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const readAloud = useReadAloud()
  const { recordActivity } = useFaithPoints()
  const { playSoundEffect } = useSoundEffects()
  const { getPlanStatus } = useReadingPlanProgress()
  const [isCompleted, setIsCompleted] = useState(false)

  // Find matching reading plan by theme
  const matchingPlan = READING_PLANS.find(
    (p) => (p.theme as string) === (devotional.theme as string),
  )
  const matchingPlanStatus = matchingPlan ? getPlanStatus(matchingPlan.id) : 'completed'
  const showPlanCallout = matchingPlan && matchingPlanStatus !== 'completed'

  // Check existing completion state on mount / auth change
  useEffect(() => {
    if (!isAuthenticated) return
    let reads: string[] = []
    try {
      reads = JSON.parse(localStorage.getItem('wr_devotional_reads') || '[]') as string[]
    } catch {
      // Malformed localStorage — treat as empty
    }
    const todayStr = new Date().toLocaleDateString('en-CA')
    setIsCompleted(reads.includes(todayStr))
  }, [isAuthenticated])

  // Intersection Observer — only for today's devotional when logged in
  useEffect(() => {
    if (!isAuthenticated || dayOffset !== 0 || isCompleted) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const todayStr = new Date().toLocaleDateString('en-CA')
          let reads: string[] = []
          try {
            reads = JSON.parse(localStorage.getItem('wr_devotional_reads') || '[]') as string[]
          } catch {
            // Malformed localStorage — treat as empty
          }
          if (!reads.includes(todayStr)) {
            reads.push(todayStr)
            while (reads.length > 365) reads.shift()
            localStorage.setItem('wr_devotional_reads', JSON.stringify(reads))
          }
          setIsCompleted(true)
          recordActivity('devotional')
          playSoundEffect('chime')
          onComplete?.()
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    if (questionRef.current) observer.observe(questionRef.current)
    return () => observer.disconnect()
  }, [isAuthenticated, dayOffset, isCompleted, recordActivity, onComplete])

  const navigateDay = useCallback(
    (direction: -1 | 1) => {
      const newOffset = dayOffset + direction
      if (newOffset >= -7 && newOffset <= 0) {
        const params: Record<string, string> = { tab: 'devotional' }
        if (newOffset !== 0) params.day = String(newOffset)
        setSearchParams(params, { replace: true })
      }
    },
    [dayOffset, setSearchParams],
  )

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => navigateDay(1),
    onSwipeRight: () => navigateDay(-1),
  })

  const handleShareClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast('Link copied!', 'success')
    } catch {
      showToast('Could not copy link', 'error')
    }
  }, [showToast])

  const handleReadAloudClick = useCallback(() => {
    if (readAloud.state === 'idle') readAloud.play(buildReadAloudText(devotional))
    else if (readAloud.state === 'playing') readAloud.pause()
    else readAloud.resume()
  }, [readAloud, devotional])

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14" {...swipeHandlers}>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={SQUIGGLE_MASK_STYLE}
        >
          <BackgroundSquiggle />
        </div>
        <div className="relative">
          {/* Heading */}
          <h2 className="mb-4 text-center font-sans text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            What&apos;s On Your{' '}
            <span className="font-script text-3xl text-primary sm:text-4xl lg:text-5xl">
              Soul?
            </span>
          </h2>

          {/* Date navigation */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigateDay(-1)}
              disabled={dayOffset <= -7}
              className={cn(
                'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 transition-colors',
                dayOffset <= -7
                  ? 'cursor-not-allowed text-white/15'
                  : 'text-white/40 hover:text-white/70',
              )}
              aria-label="Previous day's devotional"
              aria-disabled={dayOffset <= -7}
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg text-white/85 sm:text-xl">{dateStr}</span>
              {isCompleted && dayOffset === 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-sm text-white/50">
                  <Check size={14} />
                  Completed
                </span>
              )}
            </div>
            <button
              onClick={() => navigateDay(1)}
              disabled={dayOffset >= 0}
              className={cn(
                'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 transition-colors',
                dayOffset >= 0
                  ? 'cursor-not-allowed text-white/15'
                  : 'text-white/40 hover:text-white/70',
              )}
              aria-label="Next day's devotional"
              aria-disabled={dayOffset >= 0}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Devotional title */}
          <h3 className="pt-8 text-center text-2xl font-bold text-white sm:pt-10 sm:text-3xl">
            {devotional.title}
          </h3>
          <div className="mt-2 text-center">
            <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/50">
              {devotional.theme}
            </span>
          </div>

          {/* Quote section */}
          <div className="border-t border-white/10 py-8 sm:py-10">
            <div className="relative">
              <span className="font-serif text-5xl leading-none text-white/20" aria-hidden="true">
                &ldquo;
              </span>
              <blockquote className="mt-2 font-serif text-xl italic leading-relaxed text-white/70 sm:text-2xl">
                {devotional.quote.text}
              </blockquote>
              <p className="mt-3 text-sm text-white/40">&mdash; {devotional.quote.attribution}</p>
            </div>
          </div>

          {/* Passage section */}
          <div className="border-t border-white/10 py-8 sm:py-10">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest">
              <VerseLink
                reference={devotional.passage.reference}
                className="text-primary-lt"
              />
            </p>
            <p className="font-serif text-base italic leading-relaxed text-white/70 sm:text-lg">
              {devotional.passage.verses.map((verse) => (
                <span key={verse.number}>
                  <sup className="mr-1 align-super font-sans text-xs text-white/30">
                    {verse.number}
                  </sup>
                  {verse.text}{' '}
                </span>
              ))}
            </p>
          </div>

          {/* Reflection section */}
          <div className="border-t border-white/10 py-8 sm:py-10">
            <div className="space-y-4 text-base leading-relaxed text-white/80">
              {devotional.reflection.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Prayer section */}
          <div className="border-t border-white/10 py-8 sm:py-10">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
              Closing Prayer
            </p>
            <p className="font-serif text-base italic leading-relaxed text-white/60">
              {devotional.prayer}
            </p>
          </div>

          {/* Reflection question section */}
          <div className="border-t border-white/10 py-8 sm:py-10" ref={questionRef}>
            <div className="rounded-2xl border border-white/10 border-l-2 border-l-primary bg-white/[0.06] p-4 backdrop-blur-sm sm:p-6">
              <p className="text-sm text-white/40">Something to think about today:</p>
              <p className="mt-2 text-lg font-medium text-white">
                {devotional.reflectionQuestion.replace('Something to think about today: ', '')}
              </p>
            </div>
          </div>

          {/* Related reading plan callout */}
          {showPlanCallout && (
            <RelatedPlanCallout
              planId={matchingPlan.id}
              planTitle={matchingPlan.title}
              planDuration={matchingPlan.durationDays}
              planStatus={matchingPlanStatus as 'unstarted' | 'active' | 'paused'}
            />
          )}

          {/* Share & Read Aloud */}
          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">
            <button
              onClick={handleShareClick}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              <Share2 size={18} />
              Share today&apos;s devotional
            </button>
            <button
              onClick={handleReadAloudClick}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              <Volume2 size={18} />
              {readAloud.state === 'idle'
                ? 'Read aloud'
                : readAloud.state === 'playing'
                  ? 'Pause'
                  : 'Resume'}
            </button>
          </div>

          {/* Cross-tab CTAs */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => onSwitchToJournal?.(devotional.theme)}
              className="text-sm font-medium text-primary transition-colors hover:text-primary-light"
            >
              Journal about this &rarr;
            </button>
            <button
              type="button"
              onClick={() => onSwitchToPray?.(`I'm reflecting on ${devotional.passage.reference}...`)}
              className="text-sm font-medium text-primary transition-colors hover:text-primary-light"
            >
              Pray about today&apos;s reading &rarr;
            </button>
          </div>

          {/* Bottom padding */}
          <div className="pb-16 sm:pb-20" />
        </div>
      </div>
    </div>
  )
}
