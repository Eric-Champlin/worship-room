import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
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
      variant="light"
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
      className={cn(
        'flex h-full flex-col rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm',
        'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
        'transition-[background-color,border-color] duration-base motion-reduce:transition-none',
        'hover:bg-white/[0.08] hover:border-white/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
      )}
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
    </Link>
  )
}
