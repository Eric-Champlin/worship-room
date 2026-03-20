import { BarChart3, BookOpen, CheckCircle2, Flame, Rocket, TrendingUp, Users } from 'lucide-react'
import type { useFaithPoints } from '@/hooks/useFaithPoints'
import { cn } from '@/lib/utils'
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap'
import { DashboardCard } from './DashboardCard'
import { MoodChart } from './MoodChart'
import { QuickActions } from './QuickActions'
import { StreakCard } from './StreakCard'
import { ActivityChecklist } from './ActivityChecklist'
import { FriendsPreview } from './FriendsPreview'
import { VerseOfTheDayCard } from './VerseOfTheDayCard'
import { WeeklyRecap } from './WeeklyRecap'
import { TodaysDevotionalCard } from './TodaysDevotionalCard'

interface DashboardWidgetGridProps {
  faithPoints: ReturnType<typeof useFaithPoints>
  justCompletedCheckIn?: boolean
  onRequestCheckIn?: () => void
  quickActionsRef?: React.RefObject<HTMLDivElement>
  quickActionsTooltipVisible?: boolean
  animateEntrance?: boolean
  staggerStartIndex?: number
}

export function DashboardWidgetGrid({ faithPoints, justCompletedCheckIn = false, onRequestCheckIn, quickActionsRef, quickActionsTooltipVisible, animateEntrance, staggerStartIndex = 0 }: DashboardWidgetGridProps) {
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
    previousStreak,
    isFreeRepairAvailable,
    repairStreak,
  } = faithPoints

  // Pre-compute animation props for each card in DOM order
  const showRecap = recapVisible || !recapHasFriends
  let cardCounter = 0
  function getAnimProps(): { className?: string; style?: React.CSSProperties } {
    if (!animateEntrance) return {}
    const delay = (staggerStartIndex + cardCounter) * 100
    cardCounter++
    return {
      className: 'motion-safe:animate-widget-enter',
      style: { animationDelay: `${delay}ms` },
    }
  }

  const moodAnim = getAnimProps()
  const verseAnim = getAnimProps()
  const devotionalAnim = getAnimProps()
  const streakAnim = getAnimProps()
  const activityAnim = getAnimProps()
  const friendsAnim = getAnimProps()
  const recapAnim = showRecap ? getAnimProps() : {}
  const quickAnim = getAnimProps()

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">
        <DashboardCard
          id="mood-chart"
          title="7-Day Mood"
          icon={<TrendingUp className="h-5 w-5" />}
          action={{ label: 'See More', to: '/insights' }}
          className={cn('order-2 lg:order-1 lg:col-span-3', moodAnim.className)}
          style={moodAnim.style}
        >
          <MoodChart onRequestCheckIn={onRequestCheckIn} />
        </DashboardCard>

        <DashboardCard
          id="verse-of-the-day"
          title="Verse of the Day"
          icon={<BookOpen className="h-5 w-5" />}
          className={cn('order-3 lg:order-2 lg:col-span-3', verseAnim.className)}
          style={verseAnim.style}
        >
          <VerseOfTheDayCard />
        </DashboardCard>

        <DashboardCard
          id="todays-devotional"
          title="Today's Devotional"
          icon={<BookOpen className="h-5 w-5" />}
          className={cn('order-4 lg:col-span-3', devotionalAnim.className)}
          style={devotionalAnim.style}
        >
          <TodaysDevotionalCard />
        </DashboardCard>

        <DashboardCard
          id="streak-points"
          title="Streak & Faith Points"
          icon={<Flame className="h-5 w-5" />}
          className={cn('order-1 lg:order-3 lg:col-span-2', streakAnim.className)}
          style={streakAnim.style}
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
            previousStreak={previousStreak}
            isFreeRepairAvailable={isFreeRepairAvailable}
            onRepairStreak={repairStreak}
          />
        </DashboardCard>

        <DashboardCard
          id="activity-checklist"
          title="Today's Activity"
          icon={<CheckCircle2 className="h-5 w-5" />}
          className={cn('order-4 lg:col-span-3', activityAnim.className)}
          style={activityAnim.style}
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
          className={cn('order-5 lg:col-span-2', friendsAnim.className)}
          style={friendsAnim.style}
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
            className={cn('order-6 lg:col-span-5', recapAnim.className)}
            style={recapAnim.style}
          >
            <WeeklyRecap />
          </DashboardCard>
        )}

        <div
          ref={quickActionsRef}
          className={cn('order-7 lg:col-span-5', quickAnim.className)}
          style={quickAnim.style}
          {...(quickActionsTooltipVisible ? { 'aria-describedby': 'dashboard-quick-actions' } : {})}
        >
          <DashboardCard
            id="quick-actions"
            title="Quick Actions"
            icon={<Rocket className="h-5 w-5" />}
          >
            <QuickActions />
          </DashboardCard>
        </div>
      </div>
    </div>
  )
}
