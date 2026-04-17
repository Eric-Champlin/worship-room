import { Link } from 'react-router-dom'

import type { PlanMetadata } from '@/types/bible-plans'

interface PlanBrowseCardProps {
  plan: PlanMetadata
}

export function PlanBrowseCard({ plan }: PlanBrowseCardProps) {
  return (
    <article aria-label={plan.title}>
      <Link
        to={`/bible/plans/${plan.slug}`}
        className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 transition-all motion-reduce:transition-none duration-base hover:bg-white/[0.08] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
      >
        {/* Content */}
        <div className="relative z-10 flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
          <p className="text-sm text-white/60">{plan.shortTitle}</p>
          <p className="text-xs text-white/50">
            {plan.duration} days &middot; {plan.estimatedMinutesPerDay} min/day
          </p>
          <p className="text-xs text-white/50">By {plan.curator}</p>
        </div>
      </Link>
    </article>
  )
}
