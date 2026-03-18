import { BarChart3, CheckCircle2, Flame, Rocket, TrendingUp, Users } from 'lucide-react'
import type { useFaithPoints } from '@/hooks/useFaithPoints'
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap'
import { DashboardCard } from './DashboardCard'
import { MoodChart } from './MoodChart'
import { QuickActions } from './QuickActions'
import { StreakCard } from './StreakCard'
import { ActivityChecklist } from './ActivityChecklist'
import { FriendsPreview } from './FriendsPreview'
import { WeeklyRecap } from './WeeklyRecap'

interface DashboardWidgetGridProps {
  faithPoints: ReturnType<typeof useFaithPoints>
  justCompletedCheckIn?: boolean
  onRequestCheckIn?: () => void
}

export function DashboardWidgetGrid({ faithPoints, justCompletedCheckIn = false, onRequestCheckIn }: DashboardWidgetGridProps) {
  const { isVisible: recapVisible, hasFriends: recapHasFriends } = useWeeklyRecap()
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
          <MoodChart onRequestCheckIn={onRequestCheckIn} />
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
            animate={justCompletedCheckIn}
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
            animate={justCompletedCheckIn}
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

        {/* Weekly Recap — only shown when visible or has no friends (CTA) */}
        {(recapVisible || !recapHasFriends) && (
          <DashboardCard
            id="weekly-recap"
            title="Weekly Recap"
            icon={<BarChart3 className="h-5 w-5" />}
            collapsible={false}
            className="order-5 lg:col-span-5"
          >
            <WeeklyRecap />
          </DashboardCard>
        )}

        <DashboardCard
          id="quick-actions"
          title="Quick Actions"
          icon={<Rocket className="h-5 w-5" />}
          className="order-6 lg:col-span-5"
        >
          <QuickActions />
        </DashboardCard>
      </div>
    </div>
  )
}
