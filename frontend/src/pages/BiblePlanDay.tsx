import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'

import { PlanCompletionCelebration } from '@/components/bible/plans/PlanCompletionCelebration'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { SEO } from '@/components/SEO'
import { buildBiblePlanDayMetadata } from '@/lib/seo/routeMetadata'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { usePlan } from '@/hooks/bible/usePlan'
import { markDayComplete, setCelebrationShown } from '@/lib/bible/plansStore'
import { getBookBySlug } from '@/data/bible'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { cn } from '@/lib/utils'

const ATMOSPHERIC_HERO_BG =
  'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)'

interface CelebrationData {
  planTitle: string
  planDescription: string
  daysCompleted: number
  dateRange: string
  passageCount: number
  slug: string
}

export function BiblePlanDay() {
  const { slug, dayNumber: dayNumberStr } = useParams<{ slug: string; dayNumber: string }>()
  const dayNumber = parseInt(dayNumberStr ?? '1', 10)
  const { plan, progress, isLoading, isError } = usePlan(slug ?? '')
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const navigate = useNavigate()
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null)
  // BB-38: if the plan day URL has ?verse=N, flow it through to the reader
  // as a persistent selection parameter (not the one-shot ?scroll-to=).
  const [planSearchParams] = useSearchParams()
  const planVerseParam = planSearchParams.get('verse')

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dashboard-dark">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-dashboard-dark px-4">
        {/* BB-40 Step 8: noIndex on plan-not-found error */}
        <SEO
          title="Reading Plan Not Found"
          description="This reading plan doesn't exist or may have been removed."
          noIndex
        />
        <p className="text-lg text-white/70">This plan couldn&apos;t be loaded.</p>
        <Link to="/bible" className="mt-4 text-sm text-white/60 hover:text-white">
          ← Back to Bible
        </Link>
      </div>
    )
  }

  const day = plan.days.find((d) => d.day === dayNumber)
  if (!day) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-dashboard-dark px-4">
        {/* BB-40 Step 8: noIndex on day-not-found error */}
        <SEO
          title="Day Not Found"
          description={`Day ${dayNumber} doesn't exist in this plan.`}
          noIndex
        />
        <p className="text-lg text-white/70">Day {dayNumber} doesn&apos;t exist in this plan.</p>
        <Link
          to={`/bible/plans/${slug}`}
          className="mt-4 text-sm text-white/60 hover:text-white"
        >
          ← Back to {plan.title}
        </Link>
      </div>
    )
  }

  const isDayCompleted = progress?.completedDays.includes(dayNumber) ?? false
  const totalDays = plan.duration
  const hasPrev = dayNumber > 1
  const hasNext = dayNumber < totalDays

  function handleMarkComplete() {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to track your progress')
      return
    }
    const result = markDayComplete(slug!, dayNumber, totalDays)
    if (result.type === 'plan-completed' && progress && !progress.celebrationShown) {
      setCelebrationShown(slug!)
      setCelebrationData({
        planTitle: plan!.title,
        planDescription: plan!.description,
        daysCompleted: plan!.days.length,
        dateRange: `${new Date(progress.startedAt).toLocaleDateString()} – ${new Date().toLocaleDateString()}`,
        passageCount: plan!.days.reduce((sum, d) => sum + d.passages.length, 0),
        slug: plan!.slug,
      })
    }
  }

  return (
    <div className="min-h-screen bg-dashboard-dark">
      {/* BB-40 Step 8: dynamic metadata from builder. `day.title` is the curated
          day heading (e.g., "Psalm 23 — The Lord is my Shepherd"). Canonical
          override strips any `?verse=` query param. BreadcrumbList JSON-LD
          with 4 items (Bible → Plans → <plan> → Day <n>). */}
      <SEO {...buildBiblePlanDayMetadata(plan.slug, plan.title, dayNumber, day.title)} />
      {/* Header */}
      <div className="relative overflow-hidden pb-6 pt-20" style={{ background: ATMOSPHERIC_HERO_BG }}>
        <div className="relative z-10 mx-auto max-w-2xl px-4">
          {/* Back link */}
          <Link
            to={`/bible/plans/${slug}`}
            className="inline-flex min-h-[44px] items-center text-sm text-white/60 hover:text-white"
          >
            ← {plan.title}
          </Link>

          {/* Day indicator */}
          <p className="mt-3 text-sm text-white/60">
            Day {dayNumber} of {totalDays}
          </p>

          {/* Day title */}
          <h1
            className="mt-1 text-2xl font-bold sm:text-3xl"
            style={GRADIENT_TEXT_STYLE}
          >
            {day.title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
        {/* Devotional text */}
        {day.devotional && (
          <FrostedCard>
            <div className="text-white leading-[1.75] text-[17px] sm:text-lg max-w-2xl">
              {day.devotional.split('\n\n').map((paragraph, i) => (
                <p key={i} className={i > 0 ? 'mt-4' : ''}>
                  {paragraph}
                </p>
              ))}
            </div>
          </FrostedCard>
        )}

        {/* Passage cards */}
        {day.passages.length > 0 && (
          <div className={cn(
            'grid gap-4',
            day.passages.length >= 2 ? 'sm:grid-cols-2' : 'grid-cols-1',
          )}>
            {day.passages.map((passage, i) => {
              const ref = formatPassageRef(passage.book, passage.chapter, passage.startVerse, passage.endVerse)
              // BB-38: compose ?scroll-to= (renamed from ?highlight=) for the
              // one-shot arrival glow, AND forward ?verse= from the plan day
              // URL if present (persistent selection in the reader).
              const readerUrl = (() => {
                const base = `/bible/${passage.book}/${passage.chapter}`
                const params = new URLSearchParams()
                if (passage.startVerse) params.set('scroll-to', String(passage.startVerse))
                if (planVerseParam) params.set('verse', planVerseParam)
                const query = params.toString()
                return query ? `${base}?${query}` : base
              })()

              return (
                <FrostedCard key={i}>
                  <p className="font-medium text-white">{ref}</p>
                  {passage.label && (
                    <p className="mt-1 text-sm text-white/60">{passage.label}</p>
                  )}
                  <Link
                    to={readerUrl}
                    className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
                  >
                    Read this passage
                  </Link>
                </FrostedCard>
              )
            })}
          </div>
        )}

        {/* Reflection prompts */}
        {day.reflectionPrompts && day.reflectionPrompts.length > 0 && (
          <FrostedCard>
            <p className="text-xs font-medium uppercase tracking-widest text-white/60">
              Reflection
            </p>
            <ul className="mt-3 space-y-4">
              {day.reflectionPrompts.map((prompt, i) => (
                <li key={i}>
                  <p className="text-white leading-[1.75] text-[17px] sm:text-lg">{prompt}</p>
                  <Link
                    to={`/daily?tab=journal&prompt=${encodeURIComponent(prompt)}`}
                    className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
                  >
                    Journal about this
                  </Link>
                </li>
              ))}
            </ul>
          </FrostedCard>
        )}
      </div>

      {/* Bottom bar: day nav + mark complete */}
      <div className="mx-auto max-w-2xl px-4 pb-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Day navigation */}
          <div className="flex items-center gap-3">
            {hasPrev ? (
              <Link
                to={`/bible/plans/${slug}/day/${dayNumber - 1}`}
                className="inline-flex min-h-[44px] items-center gap-1 text-sm text-white/60 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
                Day {dayNumber - 1}
              </Link>
            ) : (
              <span className="inline-flex min-h-[44px] items-center gap-1 text-sm text-white/20">
                <ChevronLeft className="h-4 w-4" />
                Day 0
              </span>
            )}

            {hasNext ? (
              <Link
                to={`/bible/plans/${slug}/day/${dayNumber + 1}`}
                className="inline-flex min-h-[44px] items-center gap-1 text-sm text-white/60 hover:text-white"
              >
                Day {dayNumber + 1}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex min-h-[44px] items-center gap-1 text-sm text-white/20">
                Day {dayNumber + 1}
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>

          {/* Mark complete button */}
          {isDayCompleted ? (
            <button
              disabled
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 px-8 py-3.5 text-base font-semibold text-white/50 sm:sticky sm:static"
            >
              <CheckCircle2 className="h-5 w-5" />
              Day complete
            </button>
          ) : (
            <button
              onClick={handleMarkComplete}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark active:scale-[0.98]',
                'sticky bottom-4 sm:static',
              )}
            >
              I read this. Mark day complete.
            </button>
          )}
        </div>
      </div>

      {celebrationData && (
        <PlanCompletionCelebration
          {...celebrationData}
          onClose={() => {
            setCelebrationData(null)
            navigate(`/bible/plans/${celebrationData.slug}`)
          }}
        />
      )}
    </div>
  )
}

function formatPassageRef(
  book: string,
  chapter: number,
  startVerse?: number,
  endVerse?: number,
): string {
  const bookData = getBookBySlug(book)
  const bookName = bookData?.name ?? book.charAt(0).toUpperCase() + book.slice(1)
  let ref = `${bookName} ${chapter}`
  if (startVerse) {
    ref += `:${startVerse}`
    if (endVerse && endVerse !== startVerse) {
      ref += `-${endVerse}`
    }
  }
  return ref
}
