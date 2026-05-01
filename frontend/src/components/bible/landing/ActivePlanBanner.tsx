import { Link } from 'react-router-dom'

import { FrostedCard } from '@/components/homepage/FrostedCard'

interface ActivePlanBannerProps {
  planSlug: string
  planTitle: string
  currentDay: number
  totalDays: number
  dayTitle: string
  primaryPassage: string
}

export function ActivePlanBanner({
  planSlug,
  planTitle,
  currentDay,
  totalDays,
  dayTitle,
  primaryPassage,
}: ActivePlanBannerProps) {
  const progressPercent = Math.round((currentDay / totalDays) * 100)

  return (
    <FrostedCard as="article" variant="accent" eyebrow="Today's reading">
      <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{planTitle}</h3>

      {/* Day progress */}
      <div className="mt-3">
        <p className="text-sm text-white/60">
          Day {currentDay} of {totalDays}
        </p>
        <div
          className="mt-1.5 h-1.5 w-full rounded-full bg-white/[0.08]"
          role="progressbar"
          aria-valuenow={currentDay}
          aria-valuemax={totalDays}
          aria-label={`Plan progress: day ${currentDay} of ${totalDays}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-all motion-reduce:transition-none duration-base"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Today's reading preview */}
      <p className="mt-3 text-sm text-white/60">
        {dayTitle} · {primaryPassage}
      </p>

      {/* Actions */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Link
          to={`/bible/plans/${planSlug}/day/${currentDay}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
        >
          Continue today&apos;s reading
        </Link>
        <Link
          to={`/bible/plans/${planSlug}`}
          className="inline-flex min-h-[44px] items-center justify-center text-sm text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
        >
          View plan
        </Link>
      </div>
    </FrostedCard>
  )
}
