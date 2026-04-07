import { ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import type { ActivePlan } from '@/types/bible-landing'

interface TodaysPlanCardProps {
  plans: ActivePlan[]
}

export function TodaysPlanCard({ plans }: TodaysPlanCardProps) {
  if (plans.length === 0) {
    return (
      <FrostedCard as="article">
        <Link to="/bible/plans" className="flex flex-col items-center gap-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark">
          <ListChecks className="h-8 w-8 text-white/60" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-bold text-white">Try a reading plan</h3>
            <p className="mt-1 text-sm text-white/60">Choose from 10 guided plans</p>
          </div>
        </Link>
      </FrostedCard>
    )
  }

  // Show plan with earliest incomplete day (least progress first)
  const sorted = [...plans].sort((a, b) => a.currentDay / a.totalDays - b.currentDay / b.totalDays)
  const plan = sorted[0]
  const progressPercent = (plan.currentDay / plan.totalDays) * 100
  const extraCount = plans.length - 1

  return (
    <FrostedCard as="article">
      <Link to={`/reading-plans/${plan.planId}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark">
        <h3 className="text-lg font-bold text-white">{plan.planName}</h3>
        <p className="mt-1 text-sm text-white/60">
          Day {plan.currentDay} of {plan.totalDays}
        </p>
        <p className="mt-1 text-white">{plan.todayReading}</p>
        <div
          role="progressbar"
          aria-valuenow={plan.currentDay}
          aria-valuemin={1}
          aria-valuemax={plan.totalDays}
          aria-label={`Reading plan progress: day ${plan.currentDay} of ${plan.totalDays}`}
          className="mt-3 h-1.5 w-full rounded-full bg-white/[0.08]"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Link>
      {extraCount > 0 && (
        <Link
          to="/bible/plans"
          className="mt-3 inline-flex items-center rounded-full bg-white/[0.06] border border-white/[0.12] px-2.5 py-1 text-xs font-medium text-white/60 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
        >
          +{extraCount} more
        </Link>
      )}
    </FrostedCard>
  )
}
