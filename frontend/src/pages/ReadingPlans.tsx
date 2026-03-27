import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles, Star } from 'lucide-react'

import { CreatePlanFlow } from '@/components/reading-plans/CreatePlanFlow'
import { FilterBar } from '@/components/reading-plans/FilterBar'
import { PlanCard } from '@/components/reading-plans/PlanCard'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReadingPlanProgress } from '@/hooks/useReadingPlanProgress'
import { READING_PLANS } from '@/data/reading-plans'
import { getCustomPlanIds } from '@/utils/custom-plans-storage'
import type { PlanDifficulty, ReadingPlan } from '@/types/reading-plans'

interface ReadingPlansContentProps {
  createParam?: boolean
}

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

export function ReadingPlansContent({ createParam }: ReadingPlansContentProps = {}) {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { getProgress, getActivePlanId, startPlan, getPlanStatus } =
    useReadingPlanProgress()

  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<PlanDifficulty | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null)

  const showCreateFlow = createParam ?? searchParams.get('create') === 'true'
  const customPlanIds = isAuthenticated ? getCustomPlanIds() : []
  const activePlanId = getActivePlanId()

  const handleCreatePlan = useCallback(() => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to create a personalized reading plan')
      return
    }
    setSearchParams({ create: 'true' })
  }, [isAuthenticated, authModal, setSearchParams])

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

  const allCompleted = useMemo(
    () => READING_PLANS.every((plan) => getPlanStatus(plan.id) === 'completed'),
    [getPlanStatus],
  )

  if (showCreateFlow) {
    return <CreatePlanFlow onClose={() => setSearchParams({})} />
  }

  return (
    <>
      <section id="reading-plans-content" className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-4xl">
          {/* Create Your Own Plan card */}
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/[0.08] p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">Create Your Own Plan</h3>
                <p className="mt-1 text-sm text-white/60">
                  Tell us what you&apos;re going through and we&apos;ll create a personalized Scripture journey just for you.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreatePlan}
                className="min-h-[44px] w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-lt sm:w-auto"
              >
                Create Plan
              </button>
            </div>
          </div>

          <FilterBar
            selectedDuration={selectedDuration}
            selectedDifficulty={selectedDifficulty}
            onDurationChange={setSelectedDuration}
            onDifficultyChange={setSelectedDifficulty}
          />

          {allCompleted ? (
            <FeatureEmptyState
              icon={Star}
              heading="You've completed every plan!"
              description="New plans are coming. In the meantime, revisit your favorites or create your own."
              ctaLabel="Create a custom plan"
              onCtaClick={handleCreatePlan}
            />
          ) : sortedPlans.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {sortedPlans.map((plan: ReadingPlan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  status={getPlanStatus(plan.id)}
                  progress={getProgress(plan.id)}
                  onStart={handleStartOrContinue}
                  isCustom={customPlanIds.includes(plan.id)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center">
              <p className="text-lg text-white/60">
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
    </>
  )
}

