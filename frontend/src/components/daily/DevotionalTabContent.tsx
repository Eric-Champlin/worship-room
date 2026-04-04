import { useCallback, useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Share2, Volume2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { getTodaysDevotional, formatDevotionalDate } from '@/data/devotionals'
import { useSwipe } from '@/hooks/useSwipe'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { useReadAloud } from '@/hooks/useReadAloud'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { RelatedPlanCallout } from '@/components/devotional/RelatedPlanCallout'
import { useReadingPlanProgress } from '@/hooks/useReadingPlanProgress'
import { READING_PLAN_METADATA } from '@/data/reading-plans'
import { VerseLink } from '@/components/shared/VerseLink'
import { SharePanel } from '@/components/sharing/SharePanel'
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
  const [showPassageShare, setShowPassageShare] = useState(false)

  // Find matching reading plan by theme
  const matchingPlan = READING_PLAN_METADATA.find(
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
    } catch (_e) {
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
          } catch (_e) {
            // Malformed localStorage — treat as empty
          }
          if (!reads.includes(todayStr)) {
            reads.push(todayStr)
            while (reads.length > 365) reads.shift()
            try {
              localStorage.setItem('wr_devotional_reads', JSON.stringify(reads))
            } catch (_e) {
              // localStorage write failure is non-critical
            }
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
  }, [isAuthenticated, dayOffset, isCompleted, recordActivity, onComplete, playSoundEffect])

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
      showToast('Link copied — pass it along.', 'success')
    } catch (_e) {
      showToast("We couldn't copy that link. Try again.", 'error')
    }
  }, [showToast])

  const handleReadAloudClick = useCallback(() => {
    if (readAloud.state === 'idle') readAloud.play(buildReadAloudText(devotional))
    else if (readAloud.state === 'playing') readAloud.pause()
    else readAloud.resume()
  }, [readAloud, devotional])

  return (
    <GlowBackground variant="center" glowOpacity={0.30} className="!bg-transparent">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14" {...swipeHandlers}>
        <div className="relative">
          {/* Date navigation */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigateDay(-1)}
              disabled={dayOffset <= -7}
              className={cn(
                'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 transition-colors',
                dayOffset <= -7
                  ? 'cursor-not-allowed text-white/15'
                  : 'text-white/50 hover:text-white/70',
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
                  : 'text-white/50 hover:text-white/70',
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
          <div className="border-t border-white/[0.08] py-5 sm:py-6">
            <FrostedCard className="p-5 sm:p-6">
              <span className="font-serif text-5xl leading-none text-white/20" aria-hidden="true">
                &ldquo;
              </span>
              <blockquote className="mt-2 font-serif text-xl italic leading-relaxed text-white sm:text-2xl">
                {devotional.quote.text}
              </blockquote>
              <p className="mt-3 text-sm text-white/70">&mdash; {devotional.quote.attribution}</p>
            </FrostedCard>
          </div>

          {/* Passage section */}
          <div className="border-t border-white/[0.08] py-5 sm:py-6">
            <div className="mb-4 flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-widest">
                <VerseLink
                  reference={devotional.passage.reference}
                  className="text-primary-lt"
                />
              </p>
              <button
                type="button"
                onClick={() => setShowPassageShare(true)}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg p-1.5 text-white/50 transition-colors hover:text-white/70"
                aria-label={`Share ${devotional.passage.reference}`}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            <p className="font-serif text-base italic leading-relaxed text-white/80 sm:text-lg">
              {devotional.passage.verses.map((verse) => (
                <span key={verse.number}>
                  <sup className="mr-1 align-super font-sans text-xs text-white/30">
                    {verse.number}
                  </sup>
                  {verse.text}{' '}
                </span>
              ))}
            </p>
            <SharePanel
              verseText={devotional.passage.verses.map((v) => v.text).join(' ')}
              reference={devotional.passage.reference}
              isOpen={showPassageShare}
              onClose={() => setShowPassageShare(false)}
            />
          </div>

          {/* Reflection section */}
          <div className="border-t border-white/[0.08] py-5 sm:py-6">
            <div className="space-y-4 text-base leading-relaxed text-white">
              {devotional.reflection.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Prayer section */}
          <div className="border-t border-white/[0.08] py-5 sm:py-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/50">
              Closing Prayer
            </p>
            <p className="font-serif text-sm italic leading-relaxed text-white/60">
              {devotional.prayer}
            </p>
          </div>

          {/* Reflection question section */}
          <div className="border-t border-white/[0.08] py-5 sm:py-6" ref={questionRef}>
            <FrostedCard className="border-l-2 border-l-primary p-4 sm:p-6">
              <p className="text-sm text-white/60">Something to think about today:</p>
              <p className="mt-2 text-lg font-medium text-white">
                {devotional.reflectionQuestion.replace('Something to think about today: ', '')}
              </p>
            </FrostedCard>
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
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm font-medium text-white backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.04)] transition-all hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)]"
            >
              <Share2 size={18} />
              Share today&apos;s devotional
            </button>
            <button
              onClick={handleReadAloudClick}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm font-medium text-white backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.04)] transition-all hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)]"
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
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary transition-colors hover:text-primary-light"
            >
              Journal about this &rarr;
            </button>
            <button
              type="button"
              onClick={() => onSwitchToPray?.(`I'm reflecting on ${devotional.passage.reference}...`)}
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary transition-colors hover:text-primary-light"
            >
              Pray about today&apos;s reading &rarr;
            </button>
          </div>

          {/* Bottom padding */}
          <div className="pb-8 sm:pb-12" />
        </div>
      </div>
    </GlowBackground>
  )
}
