import { Link } from 'react-router-dom'

import { FrostedCard } from '@/components/homepage/FrostedCard'
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
        className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
      >
        <FrostedCard
          variant="default"
          as="div"
          className="relative min-h-[140px] flex flex-col gap-3 opacity-85 transition-all motion-reduce:transition-none duration-base ease-decelerate group-hover:bg-white/[0.10] group-hover:shadow-frosted-hover group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0"
        >
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
        </FrostedCard>
      </Link>
    </article>
  )
}
