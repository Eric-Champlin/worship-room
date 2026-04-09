import { useState, useEffect, useRef, useCallback } from 'react'
import { Layout } from '@/components/Layout'
import { SEO, SITE_URL } from '@/components/SEO'
import { BibleHero } from '@/components/bible/landing/BibleHero'
import { BibleLandingOrbs } from '@/components/bible/landing/BibleLandingOrbs'
import { StreakChip } from '@/components/bible/landing/StreakChip'
import { ResumeReadingCard } from '@/components/bible/landing/ResumeReadingCard'
import { TodaysPlanCard } from '@/components/bible/landing/TodaysPlanCard'
import { VerseOfTheDay } from '@/components/bible/landing/VerseOfTheDay'
import { QuickActionsRow } from '@/components/bible/landing/QuickActionsRow'
import { BibleSearchEntry } from '@/components/bible/landing/BibleSearchEntry'
import { BibleDrawerProvider, useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { DrawerViewRouter } from '@/components/bible/DrawerViewRouter'
import { StreakDetailModal } from '@/components/bible/streak/StreakDetailModal'
import { StreakResetWelcome } from '@/components/bible/streak/StreakResetWelcome'
import { useStreakStore } from '@/hooks/bible/useStreakStore'
import { useToast } from '@/components/ui/Toast'
import { getTodayLocal } from '@/lib/bible/dateUtils'
import { getLastRead, getActivePlans } from '@/lib/bible/landingState'
import { BIBLE_STREAK_RESET_ACK_KEY } from '@/constants/bible'
import type { LastRead, ActivePlan } from '@/types/bible-landing'

const bibleBreadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Bible' },
  ],
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    document.activeElement?.getAttribute('contenteditable') === 'true'
  )
}

function BibleLandingInner() {
  const [lastRead, setLastRead] = useState<LastRead | null>(null)
  const [plans, setPlans] = useState<ActivePlan[]>([])
  const { streak, atRisk } = useStreakStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const previousStreakRef = useRef(0)
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null)
  const displayedMilestones = useRef(new Set<number>())
  const { showToast } = useToast()
  const handleMilestoneDismissed = useCallback(() => setPendingMilestone(null), [])
  const { isOpen, close, toggle } = useBibleDrawer()

  useEffect(() => {
    setLastRead(getLastRead())
    setPlans(getActivePlans())
  }, [])

  // Check for streak reset on mount
  useEffect(() => {
    if (streak.currentStreak === 1 && streak.longestStreak > 1) {
      const today = getTodayLocal()
      try {
        const ackRaw = localStorage.getItem(BIBLE_STREAK_RESET_ACK_KEY)
        const ack = ackRaw ? JSON.parse(ackRaw) : null
        if (ack?.date !== today) {
          previousStreakRef.current = streak.longestStreak
          setShowReset(true)
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [streak.currentStreak, streak.longestStreak])

  // Detect new milestones and show toast
  useEffect(() => {
    const lastMilestone = streak.milestones[streak.milestones.length - 1]
    if (
      lastMilestone != null &&
      lastMilestone === streak.currentStreak &&
      !displayedMilestones.current.has(lastMilestone)
    ) {
      displayedMilestones.current.add(lastMilestone)
      setPendingMilestone(lastMilestone)
      showToast(`${lastMilestone} day streak!`, 'success')
    }
  }, [streak, showToast])

  // Keyboard shortcut: 'b' to toggle drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'b' && !isInputFocused()) {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  return (
    <Layout>
      <SEO
        title="Read the Bible (WEB)"
        description="Read the full World English Bible — free, public domain, no account needed. Resume reading, daily verse, reading plans, and more."
        jsonLd={bibleBreadcrumbs}
      />
      <div className="relative min-h-screen bg-dashboard-dark">
        <BibleLandingOrbs />
        <BibleHero />

        {/* Section divider: hero → content */}
        <div className="border-t border-white/[0.08] max-w-6xl mx-auto" />

        <div className="relative z-10 mx-auto max-w-4xl space-y-8 px-4 pb-16">
          {/* Streak chip — conditionally rendered to avoid empty space-y-8 gap */}
          {streak.currentStreak > 0 && (
            <div className="flex justify-center">
              <StreakChip
                streak={streak}
                atRisk={atRisk}
                pendingMilestone={pendingMilestone}
                onMilestoneDismissed={handleMilestoneDismissed}
                onClick={() => setModalOpen(true)}
              />
            </div>
          )}

          {/* Resume Reading + Today's Plan — side by side on tablet+ */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ResumeReadingCard lastRead={lastRead} />
            <TodaysPlanCard plans={plans} />
          </div>

          {/* Verse of the Day */}
          <VerseOfTheDay />

          {/* Section divider: VOTD → Quick Actions */}
          <div className="border-t border-white/[0.08]" />

          {/* Quick Actions */}
          <QuickActionsRow />

          {/* Search */}
          <BibleSearchEntry />

          {/* Footer note */}
          <p className="text-center text-sm text-white/50">
            World English Bible (WEB) — Public Domain — No account, ever.
          </p>
        </div>
      </div>

      {/* Books Drawer */}
      <BibleDrawer isOpen={isOpen} onClose={close} ariaLabel="Books of the Bible">
        <DrawerViewRouter onClose={close} />
      </BibleDrawer>

      {/* Streak Detail Modal */}
      {modalOpen && (
        <StreakDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          streak={streak}
          atRisk={atRisk}
        />
      )}

      {/* Streak Reset Welcome */}
      {showReset && (
        <StreakResetWelcome
          previousStreak={previousStreakRef.current}
          onContinue={() => {
            const today = getTodayLocal()
            localStorage.setItem(BIBLE_STREAK_RESET_ACK_KEY, JSON.stringify({ date: today }))
            setShowReset(false)
          }}
        />
      )}
    </Layout>
  )
}

export function BibleLanding() {
  return (
    <BibleDrawerProvider>
      <AuthModalProvider>
        <BibleLandingInner />
      </AuthModalProvider>
    </BibleDrawerProvider>
  )
}
