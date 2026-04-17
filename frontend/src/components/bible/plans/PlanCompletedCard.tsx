import { Link } from 'react-router-dom'

import type { PlanMetadata, PlanProgress } from '@/types/bible-plans'
import { getPlanIconConfig } from './plan-icon-map'

interface PlanCompletedCardProps {
  plan: PlanMetadata
  progress: PlanProgress
}

function formatCompletionDate(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return isoDate
  }
}

export function PlanCompletedCard({ plan, progress }: PlanCompletedCardProps) {
  const { icon: Icon, colorClass } = getPlanIconConfig(plan.slug)

  return (
    <article aria-label={plan.title}>
      <Link
        to={`/bible/plans/${plan.slug}`}
        className="group relative flex min-h-[140px] flex-col gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-5 opacity-85 transition-all motion-reduce:transition-none duration-base ease-standard hover:bg-white/[0.06] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
      >
        {/* Brighter top-edge accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" aria-hidden="true" />

        {/* Completed badge */}
        <span className="absolute right-3 top-3 z-10 rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/80">
          Completed
        </span>

        {/* Icon + Title row */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <Icon className={`h-5 w-5 ${colorClass}`} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-white">{plan.title}</h3>
            <p className="text-sm text-white/70">{plan.shortTitle}</p>
          </div>
        </div>

        {/* Meta line */}
        {progress.completedAt && (
          <p className="text-xs text-white/50">
            Finished {formatCompletionDate(progress.completedAt)}
          </p>
        )}
      </Link>
    </article>
  )
}
