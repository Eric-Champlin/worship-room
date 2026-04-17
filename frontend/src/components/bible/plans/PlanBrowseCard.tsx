import { Link } from 'react-router-dom'

import type { PlanMetadata } from '@/types/bible-plans'
import { getPlanIconConfig } from './plan-icon-map'

interface PlanBrowseCardProps {
  plan: PlanMetadata
}

export function PlanBrowseCard({ plan }: PlanBrowseCardProps) {
  const { icon: Icon, colorClass } = getPlanIconConfig(plan.slug)

  return (
    <article aria-label={plan.title}>
      <Link
        to={`/bible/plans/${plan.slug}`}
        className="group relative flex min-h-[140px] flex-col gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-5 transition-all motion-reduce:transition-none duration-base ease-standard hover:bg-white/[0.06] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
      >
        {/* Brighter top-edge accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" aria-hidden="true" />

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

        {/* Meta lines */}
        <p className="text-xs text-white/50">
          {plan.duration} days &middot; {plan.estimatedMinutesPerDay} min/day
        </p>
        <p className="text-xs text-white/50">By {plan.curator}</p>
      </Link>
    </article>
  )
}
