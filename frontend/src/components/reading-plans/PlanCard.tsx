import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { PLAN_DIFFICULTY_LABELS, PLAN_THEME_LABELS } from '@/constants/reading-plans'
import type { ReadingPlanMeta, PlanProgress } from '@/types/reading-plans'

interface PlanCardProps {
  plan: ReadingPlanMeta
  status: 'unstarted' | 'active' | 'paused' | 'completed'
  progress?: PlanProgress
  onStart: (planId: string) => void
  isCustom?: boolean
}

function StatusAction({
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
      <span className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success">
        Completed
      </span>
    )
  }

  const label =
    status === 'active' ? 'Continue' : status === 'paused' ? 'Resume' : 'Start Plan'

  return (
    <Button
      variant="subtle"
      className="w-full"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onStart(planId)
      }}
    >
      {label}
    </Button>
  )
}

export function PlanCard({ plan, status, progress, onStart, isCustom }: PlanCardProps) {
  return (
    <Link
      to={`/reading-plans/${plan.id}`}
      className="block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
    >
      <FrostedCard
        variant="default"
        onClick={() => {}}
        className="flex h-full flex-col p-6"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg leading-none" aria-hidden="true">
            {plan.coverEmoji}
          </span>
          <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
        </div>

        {isCustom && (
          <span className="mt-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary-lt">
            Created for you
          </span>
        )}

        <p className="mt-2 line-clamp-2 text-sm text-white/70">{plan.description}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
            {plan.durationDays} days
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
            {PLAN_DIFFICULTY_LABELS[plan.difficulty]}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
            {PLAN_THEME_LABELS[plan.theme]}
          </span>
        </div>

        {progress && !progress.completedAt && (
          <p className="mt-2 text-sm text-white/50">
            Day {progress.currentDay} of {plan.durationDays}
          </p>
        )}

        <div className={cn('mt-auto pt-4', status === 'completed' && 'text-center')}>
          <StatusAction status={status} planId={plan.id} onStart={onStart} />
        </div>
      </FrostedCard>
    </Link>
  )
}
