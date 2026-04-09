import { Link } from 'react-router-dom'

import type { PlanMetadata, PlanProgress } from '@/types/bible-plans'

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
  return (
    <article aria-label={plan.title}>
      <Link
        to={`/bible/plans/${plan.slug}`}
        className={`group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${plan.coverGradient} p-5 opacity-85 transition-all duration-200 motion-safe:hover:-translate-y-1 hover:border-white/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark`}
      >
        {/* Dark scrim for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

        {/* Completed badge */}
        <span className="absolute right-3 top-3 z-10 rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/80">
          Completed
        </span>

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
          <p className="text-sm text-white/60">{plan.shortTitle}</p>
          {progress.completedAt && (
            <p className="text-xs text-white/50">
              Finished {formatCompletionDate(progress.completedAt)}
            </p>
          )}
        </div>
      </Link>
    </article>
  )
}
