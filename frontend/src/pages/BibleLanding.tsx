import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { HorizonGlow } from '@/components/daily/HorizonGlow'
import { SEO, SITE_URL } from '@/components/SEO'
import { BIBLE_LANDING_METADATA, buildBibleSearchMetadata } from '@/lib/seo/routeMetadata'
import { BibleHero } from '@/components/bible/landing/BibleHero'
import { StreakChip } from '@/components/bible/landing/StreakChip'
import { BibleHeroSlot } from '@/components/bible/landing/BibleHeroSlot'
import { TodaysPlanCard } from '@/components/bible/landing/TodaysPlanCard'
import { QuickActionsRow } from '@/components/bible/landing/QuickActionsRow'
import { BibleSearchEntry } from '@/components/bible/landing/BibleSearchEntry'
import { BibleSearchMode } from '@/components/bible/BibleSearchMode'
import { useSearchQuery } from '@/hooks/url/useSearchQuery'
import { BibleDrawerProvider, useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { DrawerViewRouter } from '@/components/bible/DrawerViewRouter'
import { StreakDetailModal } from '@/components/bible/streak/StreakDetailModal'
import { StreakResetWelcome } from '@/components/bible/streak/StreakResetWelcome'
import { useStreakStore } from '@/hooks/bible/useStreakStore'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { getTodayLocal } from '@/lib/bible/dateUtils'
import { getActivePlans } from '@/lib/bible/landingState'
import { BIBLE_STREAK_RESET_ACK_KEY } from '@/constants/bible'
import type { ActivePlan } from '@/types/bible-landing'

const bibleBreadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Study Bible' },
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
  // BB-38 search deep-link consumer: `/bible?mode=search&q=<query>` renders
  // BibleSearchMode in place of the landing content. `?q=` flows through via
  // `useSearchQuery` (debounced URL writer, 250ms). When mode is not 'search',
  // the landing page renders its normal content (hero slot, today's plan,
  // quick actions, BibleSearchEntry). This is BB-38 Finding 1's fix —
  // BibleBrowser.tsx used to own this behavior but was orphaned when the
  // Bible redesign moved `/bible` to BibleLanding. See
  // `_plans/recon/bb38-url-formats.md` for the contract.
  const [searchParams, setSearchParams] = useSearchParams()
  const isSearchMode = searchParams.get('mode') === 'search'
  const { query: searchQuery, setQuery: setSearchQuery } = useSearchQuery()

  const exitSearchMode = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('mode')
        next.delete('q')
        return next
      },
      { replace: false },
    )
  }, [setSearchParams])

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
  const { isAuthenticated } = useAuth()

  useEffect(() => {
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

  // BB-40: swap metadata when in search mode so the search query becomes
  // part of the rendered title/description.
  const seoMetadata = isSearchMode
    ? buildBibleSearchMetadata(searchQuery)
    : BIBLE_LANDING_METADATA

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">
      <HorizonGlow />
      <Navbar transparent />
      <SEO {...seoMetadata} jsonLd={bibleBreadcrumbs} />

      <main id="main-content" className="relative z-10 flex-1">
        <BibleHero />

        {/* Section divider: hero → content */}
        <div className="border-t border-white/[0.08] max-w-6xl mx-auto" />

        <div className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-8">
          {/* Streak chip — conditionally rendered to avoid empty space-y-8 gap.
              Visible in both landing and search mode so streak context never disappears. */}
          {isAuthenticated && streak.currentStreak > 0 && (
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

          {isSearchMode ? (
            /* BB-38 search mode: render BibleSearchMode in place of landing content.
               Empty query keeps mode=search active (matches segmented control semantics);
               the user exits search mode via the "Back to Bible" link or global nav. */
            <div className="space-y-4">
              <button
                type="button"
                onClick={exitSearchMode}
                className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Bible
              </button>
              <BibleSearchMode
                query={searchQuery}
                onQueryChange={setSearchQuery}
              />
            </div>
          ) : (
            <>
              {/* Hero slot: resume card / VOTD / lapsed link based on reader state */}
              <BibleHeroSlot />

              {/* Today's Plan — standalone below hero slot */}
              <TodaysPlanCard plans={plans} />

              {/* Section divider → Quick Actions */}
              <div className="border-t border-white/[0.08]" />

              {/* Quick Actions */}
              <QuickActionsRow />

              {/* Search */}
              <BibleSearchEntry />
            </>
          )}
        </div>
      </main>

      <SiteFooter />

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
    </div>
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
