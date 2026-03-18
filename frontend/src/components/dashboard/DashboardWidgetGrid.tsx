import { CheckCircle2, Flame, Rocket, TrendingUp, Users } from 'lucide-react'
import type { useFaithPoints } from '@/hooks/useFaithPoints'
import { DashboardCard } from './DashboardCard'
import { MoodChart } from './MoodChart'
import { QuickActions } from './QuickActions'
import { StreakCard } from './StreakCard'
import { ActivityChecklist } from './ActivityChecklist'
import { FriendsPreview } from './FriendsPreview'

interface DashboardWidgetGridProps {
  faithPoints: ReturnType<typeof useFaithPoints>
}

export function DashboardWidgetGrid({ faithPoints }: DashboardWidgetGridProps) {
  const {
    currentStreak,
    longestStreak,
    totalPoints,
    currentLevel,
    levelName,
    pointsToNextLevel,
    todayActivities,
    todayMultiplier,
  } = faithPoints

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
          <MoodChart />
        </DashboardCard>

        <DashboardCard
          id="streak-points"
          title="Streak & Faith Points"
          icon={<Flame className="h-5 w-5" />}
          className="order-1 lg:order-2 lg:col-span-2"
        >
          <StreakCard
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            totalPoints={totalPoints}
            currentLevel={currentLevel}
            levelName={levelName}
            pointsToNextLevel={pointsToNextLevel}
            todayMultiplier={todayMultiplier}
          />
        </DashboardCard>

        <DashboardCard
          id="activity-checklist"
          title="Today's Activity"
          icon={<CheckCircle2 className="h-5 w-5" />}
          className="order-3 lg:col-span-3"
        >
          <ActivityChecklist
            todayActivities={todayActivities}
            todayMultiplier={todayMultiplier}
          />
        </DashboardCard>

        <DashboardCard
          id="friends-preview"
          title="Friends & Leaderboard"
          icon={<Users className="h-5 w-5" />}
          action={{ label: 'See all', to: '/friends?tab=leaderboard' }}
          className="order-4 lg:col-span-2"
        >
          <FriendsPreview />
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
