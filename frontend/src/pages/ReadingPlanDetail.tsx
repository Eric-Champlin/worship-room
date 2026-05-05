import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Layout } from '@/components/Layout'
import { SEO, SITE_URL } from '@/components/SEO'
import { READING_PLAN_DETAIL_METADATA } from '@/lib/seo/routeMetadata'
import { DayCompletionCelebration } from '@/components/reading-plans/DayCompletionCelebration'
import { DayContent } from '@/components/reading-plans/DayContent'
import { DaySelector } from '@/components/reading-plans/DaySelector'
import { PlanCompletionOverlay } from '@/components/reading-plans/PlanCompletionOverlay'
import { PlanNotFound } from '@/components/reading-plans/PlanNotFound'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useReadingPlanProgress } from '@/hooks/useReadingPlanProgress'
import { loadReadingPlan, getReadingPlanMeta } from '@/data/reading-plans'
import type { ReadingPlan } from '@/types/reading-plans'
import { PLAN_DIFFICULTY_LABELS } from '@/constants/reading-plans'
import type { ActivityType } from '@/types/dashboard'
import { cn } from '@/lib/utils'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

export function ReadingPlanDetail() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { getProgress, completeDay } = useReadingPlanProgress()
  const { recordActivity, todayActivities } = useFaithPoints()

  const meta = planId ? getReadingPlanMeta(planId) : undefined
  const [plan, setPlan] = useState<ReadingPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    if (!planId) {
      setPlanLoading(false)
      return
    }
    setPlanLoading(true)
    loadReadingPlan(planId).then((p) => {
      setPlan(p ?? null)
      setPlanLoading(false)
    }).catch(() => {
      setPlan(null)
      setPlanLoading(false)
    })
  }, [planId])

  const progress = planId ? getProgress(planId) : undefined

  const initialDay = progress?.currentDay ?? 1
  const [selectedDay, setSelectedDay] = useState(initialDay)
  const [justCompletedDay, setJustCompletedDay] = useState<number | null>(null)
  const [showPlanOverlay, setShowPlanOverlay] = useState(false)

  // Track whether readingPlan activity was already done today BEFORE this completion
  const pointsAlreadyAwardedRef = useRef(false)

  const actionStepRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for day completion tracking
  useEffect(() => {
    if (!isAuthenticated) return
    if (!planId || !progress) return
    if (selectedDay !== progress.currentDay) return
    if (progress.completedDays.includes(selectedDay)) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Capture whether points were already awarded today before recording
          pointsAlreadyAwardedRef.current = todayActivities.readingPlan
          completeDay(planId, selectedDay)
          recordActivity('readingPlan' as ActivityType, 'reading_plan')
          setJustCompletedDay(selectedDay)
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    if (actionStepRef.current) observer.observe(actionStepRef.current)
    return () => observer.disconnect()
  }, [isAuthenticated, planId, selectedDay, progress, completeDay, recordActivity, todayActivities.readingPlan])

  // Trigger plan completion overlay after 1.5s when final day is just completed
  useEffect(() => {
    if (justCompletedDay === null) return
    if (!plan) return
    if (justCompletedDay !== plan.durationDays) return
    // Verify plan is now completed (completeDay already ran)
    const currentProgress = planId ? getProgress(planId) : undefined
    if (!currentProgress?.completedAt) return

    const timer = setTimeout(() => {
      setShowPlanOverlay(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [justCompletedDay, plan, planId, getProgress])

  const currentDayContent = useMemo(() => {
    if (!plan) return undefined
    return plan.days.find((d) => d.dayNumber === selectedDay)
  }, [plan, selectedDay])

  const isDayAccessible = useCallback(
    (day: number): boolean => {
      if (day === 1) return true
      if (!isAuthenticated) return false
      if (!progress) return false
      if (progress.completedDays.includes(day)) return true
      return day <= progress.currentDay
    },
    [isAuthenticated, progress],
  )

  const handleDayChange = useCallback(
    (day: number) => {
      if (!isDayAccessible(day)) {
        if (!isAuthenticated) {
          authModal?.openAuthModal('Sign in to start this reading plan')
          return
        }
        return
      }
      setSelectedDay(day)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [isDayAccessible, isAuthenticated, authModal],
  )

  const handlePreviousDay = useCallback(() => {
    if (selectedDay <= 1) return
    handleDayChange(selectedDay - 1)
  }, [selectedDay, handleDayChange])

  const handleNextDay = useCallback(() => {
    if (!plan || selectedDay >= plan.durationDays) return
    handleDayChange(selectedDay + 1)
  }, [selectedDay, plan, handleDayChange])

  if (!meta) return <PlanNotFound />
  if (planLoading) {
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center bg-dashboard-dark">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 motion-safe:animate-spin rounded-full border-2 border-white/20 border-t-primary" />
            <p className="mt-4 text-sm text-white/50">Loading plan...</p>
          </div>
        </div>
      </Layout>
    )
  }
  if (!plan) return <PlanNotFound />

  const completionPercent = progress
    ? Math.round((progress.completedDays.length / plan.durationDays) * 100)
    : 0

  const isLastDay = selectedDay === plan.durationDays

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Reading Plans', item: `${SITE_URL}/grow?tab=plans` },
      { '@type': 'ListItem', position: 3, name: plan.title },
    ],
  }

  return (
    <Layout>
      {/* BB-40: spread static base for ogImage/alt, preserve dynamic title/description. */}
      <SEO
        {...READING_PLAN_DETAIL_METADATA}
        title={`${plan.title} | Reading Plans`}
        description={plan.description.slice(0, 155).trim()}
        jsonLd={breadcrumbs}
      />
      <div className="min-h-screen bg-dashboard-dark">
        {/* Hero section */}
        <section
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
          style={ATMOSPHERIC_HERO_BG}
        >
          <div className="text-5xl sm:text-6xl" aria-hidden="true">
            {plan.coverEmoji}
          </div>

          <h1 className="mt-4 px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
            {plan.title}
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-base text-white/70 leading-relaxed sm:text-lg">
            {plan.description}
          </p>

          <div className="mt-4 inline-flex gap-2">
            <span className="rounded-full bg-white/10 px-4 py-1 text-sm text-white">
              {plan.durationDays} days
            </span>
            <span className="rounded-full bg-white/10 px-4 py-1 text-sm text-white">
              {PLAN_DIFFICULTY_LABELS[plan.difficulty]}
            </span>
          </div>

          {progress && !progress.completedAt && (
            <div className="mx-auto mt-4 w-full max-w-xs">
              <div
                className="h-2 rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={completionPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${completionPercent}% complete`}
              >
                <div
                  className="h-2 rounded-full bg-primary transition-all motion-reduce:transition-none duration-slow"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-white/50">
                {completionPercent}% complete
              </p>
            </div>
          )}
        </section>

        <BackgroundCanvas>
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              { label: 'Grow', href: '/grow?tab=plans' },
              { label: 'Reading Plans', href: '/grow?tab=plans' },
              { label: plan.title },
            ]}
            maxWidth="max-w-2xl"
          />

          {/* Day content */}
          {currentDayContent && (
            <DayContent day={currentDayContent} ref={actionStepRef} />
          )}

          {/* Day completion celebration */}
          {justCompletedDay === selectedDay && (
            <div className="mx-auto max-w-2xl px-4 sm:px-6">
              <DayCompletionCelebration
                dayNumber={selectedDay}
                pointsAwarded={!pointsAlreadyAwardedRef.current}
                isLastDay={isLastDay}
                onContinue={() => {
                  setJustCompletedDay(null)
                  handleNextDay()
                }}
              />
            </div>
          )}

          {/* Day navigation */}
          <div className="mx-auto max-w-2xl px-4 pb-12 sm:px-6">
            <div className="mt-8 flex flex-col items-center gap-4 sm:mt-10">
              <DaySelector
                totalDays={plan.durationDays}
                selectedDay={selectedDay}
                progress={progress}
                dayTitles={plan.days.map((d) => d.title)}
                onSelectDay={handleDayChange}
              />

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handlePreviousDay}
                  disabled={selectedDay <= 1}
                  aria-label="Go to previous day"
                  className={cn(
                    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
                    selectedDay <= 1
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-white/15',
                  )}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous Day
                </button>

                <button
                  type="button"
                  onClick={handleNextDay}
                  disabled={selectedDay >= plan.durationDays}
                  aria-label="Go to next day"
                  className={cn(
                    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
                    selectedDay >= plan.durationDays
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-white/15',
                  )}
                >
                  Next Day
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </BackgroundCanvas>
      </div>

      {/* Plan completion overlay */}
      {showPlanOverlay && (
        <PlanCompletionOverlay
          planTitle={plan.title}
          totalDays={plan.durationDays}
          planId={planId!}
          startDate={progress?.startedAt ?? null}
          onDismiss={() => setShowPlanOverlay(false)}
          onBrowsePlans={() => navigate('/grow?tab=plans')}
        />
      )}
    </Layout>
  )
}
