import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { FrostedCard } from '@/components/homepage/FrostedCard'
import { SEO } from '@/components/SEO'
import { buildBiblePlanMetadata } from '@/lib/seo/routeMetadata'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { usePlan } from '@/hooks/bible/usePlan'
import {
  pausePlan,
  restartPlan,
  startPlan,
} from '@/lib/bible/plansStore'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { cn } from '@/lib/utils'

const ATMOSPHERIC_HERO_BG =
  'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)'

export function BiblePlanDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { plan, progress, isLoading, isError } = usePlan(slug ?? '')
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const [showAllDays, setShowAllDays] = useState(false)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dashboard-dark">
        <div className="text-white/60">Loading plan...</div>
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-dashboard-dark px-4">
        {/* BB-40 Step 8: noIndex on error state so 404-ish URLs don't pollute search */}
        <SEO
          title="Reading Plan Not Found"
          description="This reading plan doesn't exist or may have been removed."
          noIndex
        />
        <p className="text-lg text-white/70">This plan couldn&apos;t be loaded. Try again later.</p>
        <Link
          to="/bible"
          className="mt-4 inline-flex min-h-[44px] items-center text-sm text-white/60 hover:text-white"
        >
          ← Back to Bible
        </Link>
      </div>
    )
  }

  const isStarted = !!progress && !progress.completedAt
  const isCompleted = !!progress?.completedAt
  const isPreview = !progress

  const totalDays = plan.duration
  const completedCount = progress?.completedDays.length ?? 0

  const visibleDays = showAllDays ? plan.days : plan.days.slice(0, 5)
  const hasMoreDays = plan.days.length > 5

  function handleStart() {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to start a reading plan')
      return
    }
    const firstDay = plan!.days[0]
    const p = firstDay?.passages[0]
    const todayReading = p ? `${p.book} ${p.chapter}` : ''
    startPlan(plan!.slug, plan!.duration, plan!.title, todayReading)
  }

  function handlePause() {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to manage your reading plan')
      return
    }
    pausePlan(plan!.slug)
  }

  function handleRestart() {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to start a reading plan')
      return
    }
    const confirmed = window.confirm('This will reset your progress. Continue?')
    if (!confirmed) return
    const firstDay = plan!.days[0]
    const p = firstDay?.passages[0]
    const todayReading = p ? `${p.book} ${p.chapter}` : ''
    restartPlan(plan!.slug, plan!.duration, plan!.title, todayReading)
  }

  return (
    <div className="min-h-screen bg-dashboard-dark">
      {/* BB-40 Step 8: dynamic metadata from builder. Includes BreadcrumbList JSON-LD
          (Bible → Plans → <plan>) and canonical override that strips any query params. */}
      <SEO {...buildBiblePlanMetadata(plan.slug, plan.title, plan.description)} />
      {/* Hero */}
      <div className="relative overflow-hidden pb-8 pt-20" style={{ background: ATMOSPHERIC_HERO_BG }}>
        {/* Plan cover gradient accent */}
        <div
          className={cn('absolute inset-0 bg-gradient-to-b opacity-20', plan.coverGradient)}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4">
          <Link
            to="/bible/plans"
            className="inline-flex min-h-[44px] items-center text-sm text-white/60 hover:text-white"
          >
            ← All plans
          </Link>

          {isCompleted && (
            <span className="ml-3 inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary-lt">
              Completed
            </span>
          )}

          <h1 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl" style={GRADIENT_TEXT_STYLE}>
            {plan.title}
          </h1>

          <p className="mt-3 text-lg text-white/70">{plan.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/60">
            <span className="rounded-full bg-white/[0.08] px-3 py-1 capitalize">{plan.theme}</span>
            <span>{plan.duration} days</span>
            <span>·</span>
            <span>About {plan.estimatedMinutesPerDay} minutes per day</span>
            <span>·</span>
            <span>By {plan.curator}</span>
          </div>

          {/* Progress bar (in-progress only) */}
          {isStarted && progress && (
            <div className="mt-6">
              <p className="text-sm text-white/60">
                Day {progress.currentDay} of {totalDays} · {completedCount} completed
              </p>
              <div
                className="mt-1.5 h-1.5 w-full rounded-full bg-white/[0.08]"
                role="progressbar"
                aria-valuenow={completedCount}
                aria-valuemax={totalDays}
                aria-label={`Plan progress: ${completedCount} of ${totalDays} days completed`}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all motion-reduce:transition-none duration-slow"
                  style={{ width: `${Math.round((completedCount / totalDays) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* CTA row */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {isPreview && (
              <button
                onClick={handleStart}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark active:scale-[0.98]"
              >
                Start this plan
              </button>
            )}

            {isStarted && progress && (
              <>
                <Link
                  to={`/bible/plans/${plan.slug}/day/${progress.currentDay}`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
                >
                  Continue from day {progress.currentDay}
                </Link>
                <button
                  onClick={handlePause}
                  className="inline-flex min-h-[44px] items-center justify-center text-sm text-white/60 transition-colors hover:text-white"
                >
                  Pause plan
                </button>
              </>
            )}

            {isCompleted && (
              <button
                onClick={handleRestart}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark active:scale-[0.98]"
              >
                Start again
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reflection (completed plan with reflection) */}
      {isCompleted && progress?.reflection && (
        <div className="mx-auto max-w-3xl px-4 pt-8">
          <FrostedCard>
            <p className="text-xs font-medium uppercase tracking-widest text-white/60">Your reflection</p>
            <p className="mt-2 text-white leading-[1.75] text-[17px] sm:text-lg">{progress.reflection}</p>
          </FrostedCard>
        </div>
      )}

      {/* Day list */}
      <div className="mx-auto max-w-3xl space-y-2 px-4 pt-8 pb-16">
        <h2 className="text-lg font-semibold text-white">Plan Overview</h2>

        {visibleDays.map((day) => {
          const isCurrentDay = isStarted && progress?.currentDay === day.day
          const isDayCompleted = progress?.completedDays.includes(day.day) ?? false
          const isOutOfOrder = isDayCompleted && day.day > (progress?.currentDay ?? 0)

          return (
            <Link
              key={day.day}
              to={`/bible/plans/${plan.slug}/day/${day.day}`}
              className={cn(
                'flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.04]',
                isCurrentDay && 'bg-white/[0.04]',
              )}
              aria-current={isCurrentDay ? 'step' : undefined}
            >
              {/* Status indicator */}
              <DayStatusIndicator
                completed={isDayCompleted}
                outOfOrder={isOutOfOrder}
              />

              {/* Day info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  Day {day.day}: {day.title}
                </p>
                <p className="text-xs text-white/50">
                  {day.passages.length} passage{day.passages.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          )
        })}

        {hasMoreDays && !showAllDays && (
          <button
            onClick={() => setShowAllDays(true)}
            className="flex min-h-[44px] w-full items-center justify-center gap-1 text-sm text-white/60 hover:text-white"
          >
            Show all {plan.days.length} days <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {hasMoreDays && showAllDays && (
          <button
            onClick={() => setShowAllDays(false)}
            className="flex min-h-[44px] w-full items-center justify-center gap-1 text-sm text-white/60 hover:text-white"
          >
            Show fewer <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

function DayStatusIndicator({ completed, outOfOrder }: { completed: boolean; outOfOrder: boolean }) {
  if (completed && outOfOrder) {
    // Ring — completed out of order
    return (
      <span
        role="img"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-transparent"
        aria-label="Completed (out of order)"
      />
    )
  }
  if (completed) {
    // Filled — completed in order
    return (
      <span
        role="img"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary"
        aria-label="Completed"
      />
    )
  }
  // Empty — not done
  return (
    <span
      role="img"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white/30"
      aria-label="Not completed"
    />
  )
}
