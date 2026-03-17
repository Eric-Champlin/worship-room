import { CheckCircle2, Flame, Rocket, TrendingUp, Users } from 'lucide-react'
import { DashboardCard } from './DashboardCard'
import { QuickActions } from './QuickActions'

function Placeholder({ text }: { text: string }) {
  return (
    <p className="py-8 text-center text-sm italic text-white/30">{text}</p>
  )
}

export function DashboardWidgetGrid() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">
        <DashboardCard
          id="mood-chart"
          title="7-Day Mood"
          icon={<TrendingUp className="h-5 w-5" />}
          action={{ label: 'See More', to: '/insights' }}
          className="order-2 lg:order-1 lg:col-span-3"
        >
          <Placeholder text="Coming in Spec 3" />
        </DashboardCard>

        <DashboardCard
          id="streak-points"
          title="Streak & Faith Points"
          icon={<Flame className="h-5 w-5" />}
          className="order-1 lg:order-2 lg:col-span-2"
        >
          <Placeholder text="Coming in Spec 6" />
        </DashboardCard>

        <DashboardCard
          id="activity-checklist"
          title="Today's Activity"
          icon={<CheckCircle2 className="h-5 w-5" />}
          className="order-3 lg:col-span-3"
        >
          <Placeholder text="Coming in Spec 6" />
        </DashboardCard>

        <DashboardCard
          id="friends-preview"
          title="Friends & Leaderboard"
          icon={<Users className="h-5 w-5" />}
          action={{ label: 'See all', to: '/friends' }}
          className="order-4 lg:col-span-2"
        >
          <Placeholder text="Coming in Spec 9" />
        </DashboardCard>

        <DashboardCard
          id="quick-actions"
          title="Quick Actions"
          icon={<Rocket className="h-5 w-5" />}
          className="order-5 lg:col-span-5"
        >
          <QuickActions />
        </DashboardCard>
      </div>
    </div>
  )
}
