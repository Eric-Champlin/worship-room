import { Link } from 'react-router-dom'

import type { PlanMetadata, PlanProgress } from '@/types/bible-plans'
import { getPlanIconConfig } from './plan-icon-map'

interface PlanInProgressCardProps {
  plan: PlanMetadata
  progress: PlanProgress
}

export function PlanInProgressCard({ plan, progress }: PlanInProgressCardProps) {
  const percentComplete = Math.round((progress.completedDays.length / plan.duration) * 100)
  const { icon: Icon, colorClass } = getPlanIconConfig(plan.slug)

  return (
    <article aria-label={plan.title}>
      <div className="relative flex min-h-[140px] flex-col gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-5 transition-all motion-reduce:transition-none duration-base ease-standard hover:bg-white/[0.06] hover:border-white/20">
        {/* Brighter top-edge accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" aria-hidden="true" />

        {/* Icon + Title row */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <Icon className={`h-5 w-5 ${colorClass}`} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-white">{plan.title}</h3>
            <p className="text-sm text-white/70">
              Day {progress.currentDay} of {plan.duration}
            </p>
            {progress.pausedAt && <p className="text-xs text-white/50">Paused</p>}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="h-1 rounded-full bg-white/20"
          role="progressbar"
          aria-valuenow={percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percentComplete}% complete`}
        >
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${percentComplete}%` }}
          />
        </div>

        {/* Continue button */}
        <Link
          to={`/bible/plans/${plan.slug}/day/${progress.currentDay}`}
          className="inline-flex min-h-[44px] items-center justify-center self-start rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
        >
          Continue
        </Link>
      </div>
    </article>
  )
}
