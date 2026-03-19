import { useEffect, useRef, useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { DashboardWidgetGrid } from '@/components/dashboard/DashboardWidgetGrid'
import { MoodCheckIn } from '@/components/dashboard/MoodCheckIn'
import { CelebrationQueue } from '@/components/dashboard/CelebrationQueue'
import { GettingStartedCard } from '@/components/dashboard/GettingStartedCard'
import { GettingStartedCelebration } from '@/components/dashboard/GettingStartedCelebration'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useGettingStarted } from '@/hooks/useGettingStarted'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { hasCheckedInToday } from '@/services/mood-storage'
import { isOnboardingComplete } from '@/services/onboarding-storage'
import { WelcomeWizard } from '@/components/dashboard/WelcomeWizard'
import { TooltipCallout } from '@/components/ui/TooltipCallout'
import { useTooltipCallout } from '@/hooks/useTooltipCallout'
import { TOOLTIP_DEFINITIONS } from '@/constants/tooltips'
import type { MoodEntry } from '@/types/dashboard'

type DashboardPhase = 'onboarding' | 'check_in' | 'dashboard_enter' | 'dashboard'

const DASHBOARD_ENTER_DURATION_MS = 800

export function Dashboard() {
  const { user } = useAuth()
  const prefersReduced = useReducedMotion()
  const checkedRef = useRef(false)

  const [phase, setPhase] = useState<DashboardPhase>(() => {
    if (!isOnboardingComplete()) return 'onboarding'
    return hasCheckedInToday() ? 'dashboard' : 'check_in'
  })

  const faithPoints = useFaithPoints()

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

  const handleOnboardingComplete = () => {
    setPhase(hasCheckedInToday() ? 'dashboard' : 'check_in')
  }

  const handleCheckInComplete = (_entry: MoodEntry) => {
    setPhase(prefersReduced ? 'dashboard' : 'dashboard_enter')
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

  const justCompletedCheckIn = phase === 'dashboard_enter'

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
        <DashboardHero
          userName={user.name}
          currentStreak={faithPoints.currentStreak}
          levelName={faithPoints.levelName}
          totalPoints={faithPoints.totalPoints}
          pointsToNextLevel={faithPoints.pointsToNextLevel}
          currentLevel={faithPoints.currentLevel}
        />
        {gettingStarted.isVisible && !gettingStartedCardDismissed && (
          <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 md:pb-6">
            <GettingStartedCard
              items={gettingStarted.items}
              completedCount={gettingStarted.completedCount}
              onDismiss={handleGettingStartedDismiss}
              onRequestCheckIn={handleRequestCheckIn}
            />
          </div>
        )}
        <DashboardWidgetGrid
          faithPoints={faithPoints}
          justCompletedCheckIn={justCompletedCheckIn}
          onRequestCheckIn={handleRequestCheckIn}
          quickActionsRef={quickActionsRef}
          quickActionsTooltipVisible={quickActionsTooltip.shouldShow}
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
      <CelebrationQueue
        newlyEarnedBadges={faithPoints.newlyEarnedBadges}
        clearNewlyEarnedBadges={faithPoints.clearNewlyEarnedBadges}
      />
      {showGettingStartedCelebration && (
        <GettingStartedCelebration onDismiss={handleGettingStartedCelebrationDismiss} />
      )}
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
