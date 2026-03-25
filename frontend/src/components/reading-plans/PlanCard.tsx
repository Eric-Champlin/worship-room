import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { PLAN_DIFFICULTY_LABELS, PLAN_THEME_LABELS } from '@/constants/reading-plans'
import type { ReadingPlan, PlanProgress } from '@/types/reading-plans'

interface PlanCardProps {
  plan: ReadingPlan
  status: 'unstarted' | 'active' | 'paused' | 'completed'
  progress?: PlanProgress
  onStart: (planId: string) => void
  isCustom?: boolean
}

function StatusButton({
  status,
  planId,
  onStart,
}: {
  status: PlanCardProps['status']
  planId: string
  onStart: (planId: string) => void
}) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success">
        Completed
      </span>
    )
  }

  const label =
    status === 'active'
      ? 'Continue'
      : status === 'paused'
        ? 'Resume'
        : 'Start Plan'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onStart(planId)
      }}
      className="min-h-[44px] w-full rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-lt"
    >
      {label}
    </button>
  )
}

export function PlanCard({ plan, status, progress, onStart, isCustom }: PlanCardProps) {
  return (
    <Link
      to={`/reading-plans/${plan.id}`}
      className="block rounded-xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm transition-shadow lg:hover:shadow-md lg:hover:shadow-black/20"
    >
      <div className="mb-3 text-4xl" aria-hidden="true">
        {plan.coverEmoji}
      </div>

      {isCustom && (
        <span className="mb-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary-lt">
          Created for you
        </span>
      )}

      <h3 className="text-lg font-bold text-white">{plan.title}</h3>

      <p className="mt-1 line-clamp-2 text-sm text-white/60">
        {plan.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
          {plan.durationDays} days
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
          {PLAN_DIFFICULTY_LABELS[plan.difficulty]}
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
          {PLAN_THEME_LABELS[plan.theme]}
        </span>
      </div>

      {progress && !progress.completedAt && (
        <p className="mt-2 text-sm text-white/50">
          Day {progress.currentDay} of {plan.durationDays}
        </p>
      )}

      <div className={cn('mt-4', status === 'completed' && 'text-center')}>
        <StatusButton status={status} planId={plan.id} onStart={onStart} />
      </div>
    </Link>
  )
}
