import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { FilterBar } from '@/components/reading-plans/FilterBar'
import { PlanCard } from '@/components/reading-plans/PlanCard'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReadingPlanProgress } from '@/hooks/useReadingPlanProgress'
import { READING_PLANS } from '@/data/reading-plans'
import type { PlanDifficulty, ReadingPlan } from '@/types/reading-plans'

function ConfirmDialog({
  activePlanTitle,
  activePlanDay,
  onConfirm,
  onCancel,
}: {
  activePlanTitle: string
  activePlanDay: number
  onConfirm: () => void
  onCancel: () => void
}) {
  const containerRef = useFocusTrap(true, onCancel)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Switch reading plan"
      onClick={onCancel}
    >
      <div
        ref={containerRef}
        className="mx-auto max-w-sm rounded-2xl border border-white/15 bg-hero-mid p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white">Switch Reading Plan?</h2>
        <p className="mt-2 text-sm text-white/70">
          You&apos;re currently on Day {activePlanDay} of {activePlanTitle}.
          Starting a new plan will pause your current progress. You can resume it
          later.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            Keep Current
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-lt"
          >
            Pause &amp; Start New
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReadingPlans() {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const navigate = useNavigate()
  const { getProgress, getActivePlanId, startPlan, getPlanStatus } =
    useReadingPlanProgress()

  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<PlanDifficulty | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null)

  const activePlanId = getActivePlanId()

  const filteredPlans = useMemo(() => {
    return READING_PLANS.filter((plan) => {
      if (selectedDuration !== null && plan.durationDays !== selectedDuration)
        return false
      if (
        selectedDifficulty !== null &&
        plan.difficulty !== selectedDifficulty
      )
        return false
      return true
    })
  }, [selectedDuration, selectedDifficulty])

  const sortedPlans = useMemo(() => {
    const statusOrder = { active: 0, paused: 1, unstarted: 2, completed: 3 }
    return [...filteredPlans].sort((a, b) => {
      const statusA = getPlanStatus(a.id)
      const statusB = getPlanStatus(b.id)
      return statusOrder[statusA] - statusOrder[statusB]
    })
  }, [filteredPlans, getPlanStatus])

  const handleStartOrContinue = useCallback(
    (planId: string) => {
      if (!isAuthenticated) {
        authModal?.openAuthModal('Sign in to start this reading plan')
        return
      }

      const status = getPlanStatus(planId)

      // Already started — navigate to detail page (don't restart)
      if (status === 'active' || status === 'paused') {
        navigate(`/reading-plans/${planId}`)
        return
      }

      // Unstarted — check if another plan is active
      if (activePlanId && activePlanId !== planId) {
        setConfirmTarget(planId)
        return
      }

      startPlan(planId)
    },
    [isAuthenticated, authModal, activePlanId, startPlan, getPlanStatus, navigate],
  )

  const handleConfirmSwitch = useCallback(() => {
    if (confirmTarget) {
      startPlan(confirmTarget)
      setConfirmTarget(null)
    }
  }, [confirmTarget, startPlan])

  const handleCancelSwitch = useCallback(() => {
    setConfirmTarget(null)
  }, [])

  const clearFilters = useCallback(() => {
    setSelectedDuration(null)
    setSelectedDifficulty(null)
  }, [])

  const activePlan = activePlanId
    ? READING_PLANS.find((p) => p.id === activePlanId)
    : null
  const activeProgress = activePlanId ? getProgress(activePlanId) : undefined

  return (
    <Layout>
      <PageHero title="Reading Plans" subtitle="Guided journeys through Scripture" />

      <section className="bg-neutral-bg px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <FilterBar
            selectedDuration={selectedDuration}
            selectedDifficulty={selectedDifficulty}
            onDurationChange={setSelectedDuration}
            onDifficultyChange={setSelectedDifficulty}
          />

          {sortedPlans.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {sortedPlans.map((plan: ReadingPlan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  status={getPlanStatus(plan.id)}
                  progress={getProgress(plan.id)}
                  onStart={handleStartOrContinue}
                />
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center">
              <p className="text-lg text-text-light">
                No reading plans match your filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 min-h-[44px] rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-lt"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {confirmTarget && activePlan && activeProgress && (
        <ConfirmDialog
          activePlanTitle={activePlan.title}
          activePlanDay={activeProgress.currentDay}
          onConfirm={handleConfirmSwitch}
          onCancel={handleCancelSwitch}
        />
      )}
    </Layout>
  )
}
