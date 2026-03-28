import type { ReactNode } from 'react'
import { BarChart3, BookOpen, CheckCircle2, Flame, Heart, Highlighter, Rocket, Target, TrendingUp, Users } from 'lucide-react'
import type { useFaithPoints } from '@/hooks/useFaithPoints'
import { cn } from '@/lib/utils'
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import { WIDGET_MAP, type WidgetId } from '@/constants/dashboard/widget-order'
import { DashboardCard } from './DashboardCard'
import { MoodChart } from './MoodChart'
import { QuickActions } from './QuickActions'
import { StreakCard } from './StreakCard'
import { ActivityChecklist } from './ActivityChecklist'
import { FriendsPreview } from './FriendsPreview'
import { VerseOfTheDayCard } from './VerseOfTheDayCard'
import { WeeklyRecap } from './WeeklyRecap'
import { TodaysDevotionalCard } from './TodaysDevotionalCard'
import { PrayerListWidget } from './PrayerListWidget'
import { ReadingPlanWidget } from './ReadingPlanWidget'
import { GratitudeWidget } from './GratitudeWidget'
import { ChallengeWidget } from './ChallengeWidget'
import { RecentHighlightsWidget } from './RecentHighlightsWidget'
import type { GettingStartedCardProps } from './GettingStartedCard'
import { GettingStartedCard } from './GettingStartedCard'
import type { EveningReflectionBannerProps } from './EveningReflectionBanner'
import { EveningReflectionBanner } from './EveningReflectionBanner'

interface DashboardWidgetGridProps {
  faithPoints: ReturnType<typeof useFaithPoints>
  orderedWidgets?: WidgetId[]
  justCompletedCheckIn?: boolean
  onRequestCheckIn?: () => void
  quickActionsRef?: React.RefObject<HTMLDivElement>
  quickActionsTooltipVisible?: boolean
  animateEntrance?: boolean
  staggerStartIndex?: number
  showGettingStarted?: boolean
  gettingStartedProps?: GettingStartedCardProps
  showEveningBanner?: boolean
  eveningBannerProps?: EveningReflectionBannerProps
  hasActiveReadingPlan?: boolean
  hasActiveChallenge?: boolean
  hasHighlightsOrNotes?: boolean
  isCustomizing?: boolean
}

export function DashboardWidgetGrid({
  faithPoints,
  orderedWidgets: orderedWidgetsProp,
  justCompletedCheckIn = false,
  onRequestCheckIn,
  quickActionsRef,
  quickActionsTooltipVisible,
  animateEntrance,
  staggerStartIndex = 0,
  showGettingStarted = false,
  gettingStartedProps,
  showEveningBanner = false,
  eveningBannerProps,
  hasActiveReadingPlan = true,
  hasActiveChallenge = true,
  hasHighlightsOrNotes = true,
  isCustomizing = false,
}: DashboardWidgetGridProps) {
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

  const showRecap = recapVisible || !recapHasFriends

  const visibility: Partial<Record<WidgetId, boolean>> = {
    'getting-started': showGettingStarted,
    'evening-reflection': showEveningBanner,
    'reading-plan': hasActiveReadingPlan,
    'challenge': hasActiveChallenge,
    'recent-highlights': hasHighlightsOrNotes,
    'weekly-recap': showRecap,
  }

  const { orderedWidgets: hookOrderedWidgets } = useDashboardLayout(visibility)
  const orderedWidgets = orderedWidgetsProp ?? hookOrderedWidgets

  function renderWidget(id: WidgetId, index: number): ReactNode {
    const def = WIDGET_MAP[id]
    const animClass = animateEntrance ? 'motion-safe:animate-widget-enter' : undefined
    const animStyle = animateEntrance ? { animationDelay: `${(staggerStartIndex + index) * 100}ms` } : undefined
    const transitionClass = isCustomizing ? 'transition-all duration-300 ease-in-out motion-reduce:transition-none' : undefined

    switch (id) {
      case 'mood-chart':
        return (
          <DashboardCard
            key="mood-chart"
            id="mood-chart"
            title="7-Day Mood"
            icon={<TrendingUp className="h-5 w-5" />}
            action={{ label: 'See More', to: '/insights' }}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <MoodChart onRequestCheckIn={onRequestCheckIn} />
          </DashboardCard>
        )

      case 'votd':
        return (
          <DashboardCard
            key="votd"
            id="verse-of-the-day"
            title="Verse of the Day"
            icon={<BookOpen className="h-5 w-5" />}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <VerseOfTheDayCard />
          </DashboardCard>
        )

      case 'devotional':
        return (
          <DashboardCard
            key="devotional"
            id="todays-devotional"
            title="Today's Devotional"
            icon={<BookOpen className="h-5 w-5" />}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <TodaysDevotionalCard />
          </DashboardCard>
        )

      case 'reading-plan':
        return (
          <DashboardCard
            key="reading-plan"
            id="reading-plan"
            title="Reading Plan"
            icon={<BookOpen className="h-5 w-5" />}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <ReadingPlanWidget />
          </DashboardCard>
        )

      case 'prayer-list':
        return (
          <DashboardCard
            key="prayer-list"
            id="prayer-list"
            title="My Prayers"
            icon={<Heart className="h-5 w-5" />}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <PrayerListWidget />
          </DashboardCard>
        )

      case 'recent-highlights':
        return (
          <DashboardCard
            key="recent-highlights"
            id="recent-highlights"
            title="Recent Highlights"
            icon={<Highlighter className="h-5 w-5" />}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <RecentHighlightsWidget />
          </DashboardCard>
        )

      case 'gratitude':
        return (
          <DashboardCard
            key="gratitude"
            id="todays-gratitude"
            title="Today's Gratitude"
            icon={<Heart className="h-5 w-5 text-pink-400" />}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <GratitudeWidget onGratitudeSaved={() => faithPoints.recordActivity('gratitude')} />
          </DashboardCard>
        )

      case 'streak':
        return (
          <DashboardCard
            key="streak"
            id="streak-points"
            title="Streak & Faith Points"
            icon={<Flame className="h-5 w-5" />}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
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
        )

      case 'activity-checklist':
        return (
          <DashboardCard
            key="activity-checklist"
            id="activity-checklist"
            title="Today's Activity"
            icon={<CheckCircle2 className="h-5 w-5" />}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <ActivityChecklist
              todayActivities={todayActivities}
              todayMultiplier={todayMultiplier}
              animate={justCompletedCheckIn}
            />
          </DashboardCard>
        )

      case 'challenge':
        return (
          <DashboardCard
            key="challenge"
            id="challenge"
            title="Challenge"
            icon={<Target className="h-5 w-5" />}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <ChallengeWidget />
          </DashboardCard>
        )

      case 'friends':
        return (
          <DashboardCard
            key="friends"
            id="friends-preview"
            title="Friends & Leaderboard"
            icon={<Users className="h-5 w-5" />}
            action={{ label: 'See all', to: '/friends?tab=leaderboard' }}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <FriendsPreview />
          </DashboardCard>
        )

      case 'weekly-recap':
        return (
          <DashboardCard
            key="weekly-recap"
            id="weekly-recap"
            title="Weekly Recap"
            icon={<BarChart3 className="h-5 w-5" />}
            collapsible={false}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <WeeklyRecap />
          </DashboardCard>
        )

      case 'quick-actions':
        return (
          <div
            key="quick-actions"
            ref={quickActionsRef}
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
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
        )

      case 'getting-started':
        if (!gettingStartedProps) return null
        return (
          <div
            key="getting-started"
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <GettingStartedCard {...gettingStartedProps} />
          </div>
        )

      case 'evening-reflection':
        if (!eveningBannerProps) return null
        return (
          <div
            key="evening-reflection"
            className={cn(def.colSpan, animClass, transitionClass)}
            style={{ order: index, ...animStyle }}
          >
            <EveningReflectionBanner {...eveningBannerProps} />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">
        {orderedWidgets.map((id, index) => renderWidget(id, index))}
      </div>
    </div>
  )
}
