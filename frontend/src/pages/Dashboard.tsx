import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { DashboardWidgetGrid } from '@/components/dashboard/DashboardWidgetGrid'
import { MoodCheckIn } from '@/components/dashboard/MoodCheckIn'
import { MoodRecommendations } from '@/components/dashboard/MoodRecommendations'
import { CelebrationQueue } from '@/components/dashboard/CelebrationQueue'
import { GettingStartedCard } from '@/components/dashboard/GettingStartedCard'
import { GettingStartedCelebration } from '@/components/dashboard/GettingStartedCelebration'
import { WeeklyGodMoments } from '@/components/dashboard/WeeklyGodMoments'
import { EveningReflectionBanner } from '@/components/dashboard/EveningReflectionBanner'
import { EveningReflection } from '@/components/dashboard/EveningReflection'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'
import { useAuth } from '@/hooks/useAuth'
import { useWeeklyGodMoments } from '@/hooks/useWeeklyGodMoments'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useGettingStarted } from '@/hooks/useGettingStarted'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { usePrayerReminders } from '@/hooks/usePrayerReminders'
import { useChallengeProgress } from '@/hooks/useChallengeProgress'
import { useChallengeAutoDetect } from '@/hooks/useChallengeAutoDetect'
import { useChallengeNudge } from '@/hooks/useChallengeNudge'
import { ChallengeCompletionOverlay } from '@/components/challenges/ChallengeCompletionOverlay'
import { useToastSafe } from '@/components/ui/Toast'
import { hasCheckedInToday } from '@/services/mood-storage'
import { getMeditationMinutesForWeek } from '@/services/meditation-storage'
import { isOnboardingComplete } from '@/services/onboarding-storage'
import { isEveningTime, hasReflectedToday, markReflectionDone, hasAnyActivityToday } from '@/services/evening-reflection-storage'
import { WelcomeWizard } from '@/components/dashboard/WelcomeWizard'
import { TooltipCallout } from '@/components/ui/TooltipCallout'
import { useTooltipCallout } from '@/hooks/useTooltipCallout'
import { TOOLTIP_DEFINITIONS } from '@/constants/tooltips'
import { CHALLENGES } from '@/data/challenges'
import { BADGE_MAP } from '@/constants/dashboard/badges'
import { cn } from '@/lib/utils'
import type { MoodEntry } from '@/types/dashboard'

type DashboardPhase = 'onboarding' | 'check_in' | 'recommendations' | 'dashboard_enter' | 'dashboard'

const DASHBOARD_ENTER_DURATION_MS = 800

export function Dashboard() {
  const { user } = useAuth()
  const prefersReduced = useReducedMotion()
  const checkedRef = useRef(false)
  const hasAnimatedRef = useRef(false)
  const [animateEntrance, setAnimateEntrance] = useState(false)

  const [phase, setPhase] = useState<DashboardPhase>(() => {
    if (!isOnboardingComplete()) return 'onboarding'
    return hasCheckedInToday() ? 'dashboard' : 'check_in'
  })
  const [lastMoodEntry, setLastMoodEntry] = useState<MoodEntry | null>(null)

  const faithPoints = useFaithPoints()
  const godMoments = useWeeklyGodMoments()
  usePrayerReminders(phase === 'dashboard')

  // Challenge hooks
  const challengeNavigate = useNavigate()
  const { showToast: challengeShowToast } = useToastSafe()
  const { getActiveChallenge, completeDay: challengeCompleteDay } = useChallengeProgress()
  const [challengeCompletionOverlay, setChallengeCompletionOverlay] = useState<{
    title: string; themeColor: string; days: number; points: number; badgeName: string
  } | null>(null)

  const handleAutoDetectComplete = useCallback((result: { isCompletion: boolean; bonusPoints: number; newBadgeIds: string[] }, challengeId: string) => {
    if (!result.isCompletion) return
    const challenge = CHALLENGES.find((c) => c.id === challengeId)
    if (!challenge) return
    const badgeId = result.newBadgeIds.find((id) => id.startsWith('challenge_') && !id.includes('first') && !id.includes('master'))
    const badge = badgeId ? BADGE_MAP[badgeId] : undefined
    setChallengeCompletionOverlay({
      title: challenge.title,
      themeColor: challenge.themeColor,
      days: challenge.durationDays,
      points: challenge.durationDays * 20 + result.bonusPoints,
      badgeName: badge?.name ?? 'Challenge Complete',
    })
  }, [])

  const { checkAndAutoComplete } = useChallengeAutoDetect({
    isAuthenticated: !!user,
    getActiveChallenge,
    completeDay: challengeCompleteDay,
    recordActivity: faithPoints.recordActivity,
    showToast: challengeShowToast,
  })

  // Check for challenge completion from auto-detect on dashboard mount
  useEffect(() => {
    if (phase !== 'dashboard' || !user) return
    const active = getActiveChallenge()
    if (!active) return
    const result = checkAndAutoComplete()
    if (result) {
      handleAutoDetectComplete(result, active.challengeId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useChallengeNudge({
    isAuthenticated: !!user,
    isDashboard: phase === 'dashboard',
    getActiveChallenge,
    showToast: challengeShowToast,
    navigate: challengeNavigate,
  })

  // Getting Started checklist
  const gettingStarted = useGettingStarted(faithPoints.todayActivities)
  const [showGettingStartedCelebration, setShowGettingStartedCelebration] = useState(false)
  const [gettingStartedCardDismissed, setGettingStartedCardDismissed] = useState(false)
  const celebrationFiredRef = useRef(false)

  // Trigger celebration when all items complete (only once)
  useEffect(() => {
    if (gettingStarted.allComplete && gettingStarted.isVisible && !celebrationFiredRef.current) {
      celebrationFiredRef.current = true
      setShowGettingStartedCelebration(true)
    }
  }, [gettingStarted.allComplete, gettingStarted.isVisible])

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true
      if (!isOnboardingComplete()) {
        setPhase('onboarding')
      } else {
        setPhase(hasCheckedInToday() ? 'dashboard' : 'check_in')
      }
    }
  }, [])

  // Auto-advance from dashboard_enter to dashboard
  useEffect(() => {
    if (phase !== 'dashboard_enter') return
    if (prefersReduced) {
      setPhase('dashboard')
      return
    }
    const timer = setTimeout(() => {
      setPhase('dashboard')
    }, DASHBOARD_ENTER_DURATION_MS)
    return () => clearTimeout(timer)
  }, [phase, prefersReduced])

  // Trigger entrance animation on first dashboard render
  useEffect(() => {
    if (phase === 'dashboard' && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true
      setAnimateEntrance(true)
    }
  }, [phase])

  const handleOnboardingComplete = () => {
    setPhase(hasCheckedInToday() ? 'dashboard' : 'check_in')
  }

  const handleCheckInComplete = (entry: MoodEntry) => {
    setLastMoodEntry(entry)
    setPhase(prefersReduced ? 'dashboard' : 'recommendations')
  }

  const handleRecommendationsAdvance = () => {
    setPhase('dashboard_enter')
  }

  const handleCheckInSkip = () => {
    setPhase('dashboard')
  }

  const handleRequestCheckIn = () => {
    setPhase('check_in')
  }

  // Getting Started handlers
  const handleGettingStartedDismiss = () => {
    gettingStarted.dismiss()
    setGettingStartedCardDismissed(true)
  }

  const handleGettingStartedCelebrationDismiss = () => {
    setShowGettingStartedCelebration(false)
    gettingStarted.dismiss()
    setGettingStartedCardDismissed(true)
  }

  // Evening reflection banner state (check once on mount)
  const [showReflectionOverlay, setShowReflectionOverlay] = useState(false)
  const [eveningBannerDismissed, setEveningBannerDismissed] = useState(false)
  const showEveningBanner = useMemo(() => {
    if (eveningBannerDismissed) return false
    return isEveningTime() && !hasReflectedToday() && hasAnyActivityToday(faithPoints.todayActivities)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eveningBannerDismissed])

  const handleDismissReflection = () => {
    markReflectionDone()
    setEveningBannerDismissed(true)
  }

  const handleReflectionComplete = () => {
    setShowReflectionOverlay(false)
    setEveningBannerDismissed(true)
  }

  const handleReflectionDismiss = () => {
    setShowReflectionOverlay(false)
    setEveningBannerDismissed(true)
  }

  // Tooltip for Quick Actions widget
  const quickActionsRef = useRef<HTMLDivElement>(null)
  const quickActionsTooltip = useTooltipCallout('dashboard-quick-actions', quickActionsRef)

  if (!user) return null

  if (phase === 'onboarding') {
    return (
      <WelcomeWizard
        userName={user.name}
        onComplete={handleOnboardingComplete}
      />
    )
  }

  if (phase === 'check_in') {
    return (
      <MoodCheckIn
        userName={user.name}
        onComplete={handleCheckInComplete}
        onSkip={handleCheckInSkip}
      />
    )
  }

  if (phase === 'recommendations' && lastMoodEntry) {
    return (
      <MoodRecommendations
        moodValue={lastMoodEntry.mood}
        onAdvanceToDashboard={handleRecommendationsAdvance}
      />
    )
  }

  const justCompletedCheckIn = phase === 'dashboard_enter'
  const showGettingStarted = gettingStarted.isVisible && !gettingStartedCardDismissed
  const shouldAnimate = animateEntrance && !prefersReduced

  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />
      <main
        id="main-content"
        className="motion-safe:animate-fade-in motion-reduce:animate-none"
      >
        <div
          className={shouldAnimate ? 'motion-safe:animate-widget-enter' : undefined}
          style={shouldAnimate ? { animationDelay: '0ms' } : undefined}
        >
          <DashboardHero
            userName={user.name}
            currentStreak={faithPoints.currentStreak}
            levelName={faithPoints.levelName}
            totalPoints={faithPoints.totalPoints}
            pointsToNextLevel={faithPoints.pointsToNextLevel}
            currentLevel={faithPoints.currentLevel}
            meditationMinutesThisWeek={getMeditationMinutesForWeek()}
          />
        </div>
        {godMoments.isVisible && (
          <div
            className={cn(
              'mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6',
              shouldAnimate && 'motion-safe:animate-widget-enter',
            )}
            style={shouldAnimate ? { animationDelay: '100ms' } : undefined}
          >
            <WeeklyGodMoments {...godMoments} />
          </div>
        )}
        {showGettingStarted && (
          <div
            className={cn(
              'mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6',
              shouldAnimate && 'motion-safe:animate-widget-enter',
            )}
            style={shouldAnimate ? { animationDelay: godMoments.isVisible ? '200ms' : '100ms' } : undefined}
          >
            <GettingStartedCard
              items={gettingStarted.items}
              completedCount={gettingStarted.completedCount}
              onDismiss={handleGettingStartedDismiss}
              onRequestCheckIn={handleRequestCheckIn}
            />
          </div>
        )}
        {showEveningBanner && (
          <div
            className={cn(
              'mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6',
              shouldAnimate && 'motion-safe:animate-widget-enter',
            )}
            style={shouldAnimate ? { animationDelay: `${100 * (1 + (godMoments.isVisible ? 1 : 0) + (showGettingStarted ? 1 : 0))}ms` } : undefined}
          >
            <EveningReflectionBanner
              onReflectNow={() => setShowReflectionOverlay(true)}
              onDismiss={handleDismissReflection}
            />
          </div>
        )}
        <DashboardWidgetGrid
          faithPoints={faithPoints}
          justCompletedCheckIn={justCompletedCheckIn}
          onRequestCheckIn={handleRequestCheckIn}
          quickActionsRef={quickActionsRef}
          quickActionsTooltipVisible={quickActionsTooltip.shouldShow}
          animateEntrance={shouldAnimate}
          staggerStartIndex={1 + (godMoments.isVisible ? 1 : 0) + (showGettingStarted ? 1 : 0) + (showEveningBanner ? 1 : 0)}
        />
      </main>
      {quickActionsTooltip.shouldShow && (
        <TooltipCallout
          targetRef={quickActionsRef}
          message={TOOLTIP_DEFINITIONS['dashboard-quick-actions'].message}
          tooltipId="dashboard-quick-actions"
          position={TOOLTIP_DEFINITIONS['dashboard-quick-actions'].position}
          onDismiss={quickActionsTooltip.dismiss}
        />
      )}
      <SiteFooter />
      {challengeCompletionOverlay && (
        <ChallengeCompletionOverlay
          challengeTitle={challengeCompletionOverlay.title}
          themeColor={challengeCompletionOverlay.themeColor}
          daysCompleted={challengeCompletionOverlay.days}
          totalPointsEarned={challengeCompletionOverlay.points}
          badgeName={challengeCompletionOverlay.badgeName}
          onDismiss={() => setChallengeCompletionOverlay(null)}
        />
      )}
      <CelebrationQueue
        newlyEarnedBadges={faithPoints.newlyEarnedBadges}
        clearNewlyEarnedBadges={faithPoints.clearNewlyEarnedBadges}
      />
      {showGettingStartedCelebration && (
        <GettingStartedCelebration onDismiss={handleGettingStartedCelebrationDismiss} />
      )}
      {showReflectionOverlay && (
        <EveningReflection
          onComplete={handleReflectionComplete}
          onDismiss={handleReflectionDismiss}
          todayActivities={faithPoints.todayActivities}
          todayPoints={faithPoints.todayPoints}
          currentStreak={faithPoints.currentStreak}
          recordActivity={faithPoints.recordActivity}
        />
      )}
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
