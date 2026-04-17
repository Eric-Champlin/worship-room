import { Link } from 'react-router-dom'

import type { PlanMetadata, PlanProgress } from '@/types/bible-plans'

interface PlanInProgressCardProps {
  plan: PlanMetadata
  progress: PlanProgress
}

export function PlanInProgressCard({ plan, progress }: PlanInProgressCardProps) {
  const percentComplete = Math.round((progress.completedDays.length / plan.duration) * 100)

  return (
    <article aria-label={plan.title}>
      <div
        className="relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 transition-all motion-reduce:transition-none duration-base hover:bg-white/[0.08] hover:border-white/20"
      >
        {/* Content */}
        <div className="relative z-10 flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
          <p className="text-sm text-white/80">
            Day {progress.currentDay} of {plan.duration}
          </p>
          {progress.pausedAt && <p className="text-xs text-white/50">Paused</p>}

          {/* Progress bar */}
          <div
            className="h-1 rounded-full bg-white/30"
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
            className="inline-flex min-h-[44px] items-center justify-center self-start rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          >
            Continue
          </Link>
        </div>
      </div>
    </article>
  )
}
