import { Link } from 'react-router-dom'

import { FrostedCard } from '@/components/homepage/FrostedCard'
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
        className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
      >
        <FrostedCard
          variant="default"
          as="div"
          className="min-h-[140px] flex flex-col gap-3 transition-all motion-reduce:transition-none duration-base ease-decelerate group-hover:bg-white/[0.10] group-hover:shadow-frosted-hover group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0"
        >
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
        </FrostedCard>
      </Link>
    </article>
  )
}
