import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Heart, PenLine, Wind, BookOpen, Check } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { HorizonGlow } from '@/components/daily/HorizonGlow'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SiteFooter } from '@/components/SiteFooter'
import { SongPickSection } from '@/components/SongPickSection'
import { PrayTabContent } from '@/components/daily/PrayTabContent'
import { JournalTabContent } from '@/components/daily/JournalTabContent'
import { MeditateTabContent } from '@/components/daily/MeditateTabContent'
import { DevotionalTabContent } from '@/components/daily/DevotionalTabContent'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useAuth } from '@/hooks/useAuth'
import { useTooltipCallout } from '@/hooks/useTooltipCallout'
import { TooltipCallout } from '@/components/ui/TooltipCallout'
import { TOOLTIP_DEFINITIONS } from '@/constants/tooltips'
import { SEO, SITE_URL } from '@/components/SEO'
import {
  DAILY_HUB_DEVOTIONAL_METADATA,
  DAILY_HUB_PRAY_METADATA,
  DAILY_HUB_JOURNAL_METADATA,
  DAILY_HUB_MEDITATE_METADATA,
} from '@/lib/seo/routeMetadata'

// BB-40: tab-aware metadata picker. Maps the 4 Daily Hub tab IDs to their
// corresponding metadata constants. All 4 tabs share canonical /daily because
// `tab` is in UI_STATE_PARAMS (see @/lib/seo/canonicalUrl).
const TAB_METADATA = {
  devotional: DAILY_HUB_DEVOTIONAL_METADATA,
  pray: DAILY_HUB_PRAY_METADATA,
  journal: DAILY_HUB_JOURNAL_METADATA,
  meditate: DAILY_HUB_MEDITATE_METADATA,
} as const
const dailyHubBreadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Daily Hub' },
  ],
}
import { cn } from '@/lib/utils'
import { useRoutePreload } from '@/hooks/useRoutePreload'
import { DailyAmbientPillFAB } from '@/components/daily/DailyAmbientPillFAB'
import type { AmbientContext } from '@/constants/ambient-suggestions'
import type { PrayContext, DevotionalSnapshot } from '@/types/daily-experience'
import { useDailyHubTab } from '@/hooks/url/useDailyHubTab'

const TABS = [
  { id: 'devotional', label: 'Devotional', mobileLabel: 'Devos', icon: BookOpen },
  { id: 'pray', label: 'Pray', mobileLabel: 'Pray', icon: Heart },
  { id: 'journal', label: 'Journal', mobileLabel: 'Journal', icon: PenLine },
  { id: 'meditate', label: 'Meditate', mobileLabel: 'Meditate', icon: Wind },
] as const

type TabId = (typeof TABS)[number]['id']

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function DailyHubContent() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  // BB-38: tab state extracted into useDailyHubTab. Existing behavior unchanged —
  // the hook wraps the same useSearchParams pattern that lived inline here.
  const { tab: activeTab, setTab } = useDailyHubTab()

  const { user, isAuthenticated } = useAuth()
  const { isPrayComplete, isJournalComplete, isMeditateComplete } =
    useCompletionTracking()

  const [prayContext, setPrayContext] = useState<PrayContext | null>(null)

  const [hasReadDevotional, setHasReadDevotional] = useState(() => {
    if (!isAuthenticated) return false
    try {
      const reads: string[] = JSON.parse(localStorage.getItem('wr_devotional_reads') || '[]')
      const todayStr = new Date().toLocaleDateString('en-CA')
      return reads.includes(todayStr)
    } catch (_e) { return false }
  })

  const handleDevotionalComplete = useCallback(() => {
    setHasReadDevotional(true)
  }, [])

  // Read cross-feature URL params on mount (consumed once, then cleared)
  const urlParamsConsumed = useRef(false)
  const urlContext = useRef(searchParams.get('context'))
  const urlPrompt = useRef(searchParams.get('prompt'))

  useEffect(() => {
    if (urlParamsConsumed.current) return
    urlParamsConsumed.current = true
    if (urlContext.current || urlPrompt.current) {
      // Clean URL params after consuming, keep only tab
      setSearchParams({ tab: activeTab }, { replace: true })
    }
  }, [activeTab, setSearchParams])

  // Tooltip for tab bar
  const tabBarRef = useRef<HTMLDivElement>(null)
  const tabBarTooltip = useTooltipCallout('daily-hub-tabs', tabBarRef)

  // Sticky tab bar shadow on scroll
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const switchTab = useCallback(
    (tab: TabId) => {
      setPrayContext(null)
      setTab(tab)
    },
    [setTab],
  )

  const handleSwitchToJournal = useCallback(
    (topic: string) => {
      setPrayContext({ from: 'pray', topic })
      setTab('journal')
    },
    [setTab],
  )

  const handleSwitchToDevotionalJournal = useCallback(
    (topic: string, customPrompt: string, snapshot?: DevotionalSnapshot) => {
      setPrayContext({ from: 'devotional', topic, customPrompt, devotionalSnapshot: snapshot })
      setTab('journal')
    },
    [setTab],
  )

  const handleSwitchToDevotionalPray = useCallback(
    (topic: string, customPrompt: string, snapshot?: DevotionalSnapshot) => {
      setPrayContext({ from: 'devotional', topic, customPrompt, devotionalSnapshot: snapshot })
      setTab('pray')
    },
    [setTab],
  )

  const greeting = getGreeting()
  const displayName = user ? `${greeting}, ${user.name}!` : `${greeting}!`

  const completionMap: Record<string, boolean> = {
    devotional: hasReadDevotional,
    pray: isPrayComplete,
    journal: isJournalComplete,
    meditate: isMeditateComplete,
  }

  // Screen-reader announcement for auth redirects from meditation sub-pages
  const [srMessage, setSrMessage] = useState('')
  useEffect(() => {
    const msg = (location.state as { authRedirectMessage?: string } | null)
      ?.authRedirectMessage
    if (msg) {
      setSrMessage('')
      requestAnimationFrame(() => setSrMessage(msg))
      // Clear state so back-navigation doesn't re-announce
      window.history.replaceState({}, '', window.location.href)
    }
  }, [location.state])

  const getAmbientContextForTab = (tab: TabId): AmbientContext => {
    switch (tab) {
      case 'pray':
        return 'pray'
      case 'journal':
        return 'journal'
      case 'meditate':
        return 'meditate'
      case 'devotional':
        return 'meditate'
      default:
        return 'meditate'
    }
  }

  // Arrow key navigation for tab bar (WAI-ARIA Tabs pattern)
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let nextIndex: number | null = null
      if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TABS.length
      else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
      else if (e.key === 'Home') nextIndex = 0
      else if (e.key === 'End') nextIndex = TABS.length - 1
      if (nextIndex !== null) {
        e.preventDefault()
        switchTab(TABS[nextIndex].id)
        tabButtonRefs.current[nextIndex]?.focus()
      }
    },
    [switchTab],
  )

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">
      <HorizonGlow />
      <SEO {...TAB_METADATA[activeTab]} jsonLd={dailyHubBreadcrumbs} />
      <Navbar transparent />

      <main id="main-content">
        {/* Hero Section — Greeting + Content Cards */}
        <section
          aria-labelledby="daily-hub-heading"
          className="relative z-10 flex w-full flex-col items-center px-4 pt-36 pb-6 text-center antialiased sm:pt-40 sm:pb-8 lg:pt-44"
        >
          <h1
            id="daily-hub-heading"
            className="mb-1 text-4xl font-bold leading-[1.15] pb-2 sm:text-5xl lg:text-6xl"
            style={GRADIENT_TEXT_STYLE}
          >
            {displayName}
          </h1>
        </section>

        {/* Sentinel for sticky tab bar shadow */}
        <div ref={sentinelRef} aria-hidden="true" />

        {/* Sticky Tab Bar */}
        <div
          className={cn(
            'relative sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none',
            isSticky && 'shadow-md shadow-black/20',
          )}
        >
          <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4">
            <div
              ref={tabBarRef}
              className="flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1"
              role="tablist"
              aria-label="Daily practices"
              {...(tabBarTooltip.shouldShow ? { 'aria-describedby': 'daily-hub-tabs' } : {})}
            >
              {TABS.map((tab, index) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon
                const isComplete = completionMap[tab.id]
                return (
                  <button
                    key={tab.id}
                    ref={(el) => { tabButtonRefs.current[index] = el }}
                    type="button"
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${tab.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => switchTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, index)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-full min-h-[44px] text-sm font-medium transition-all motion-reduce:transition-none duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg sm:text-base active:scale-[0.98]',
                      isActive
                        ? 'bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
                    )}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    <span className="hidden min-[400px]:inline">{tab.mobileLabel}</span>
                    <span className="sr-only min-[400px]:hidden">{tab.label}</span>
                    {isAuthenticated && isComplete && (
                      <>
                        <Check
                          className="h-4 w-4 text-success"
                          aria-hidden="true"
                        />
                        <span className="sr-only">, completed today</span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Screen-reader announcement for auth redirects */}
        <div role="status" aria-live="polite" className="sr-only">
          {srMessage}
        </div>

        {/* Tab Panels — all mounted, CSS show/hide for state preservation */}
        <div
          className="relative z-10"
          role="tabpanel"
          id="tabpanel-devotional"
          aria-labelledby="tab-devotional"
          tabIndex={0}
          hidden={activeTab !== 'devotional'}
        >
          <DevotionalTabContent
            onSwitchToJournal={handleSwitchToDevotionalJournal}
            onSwitchToPray={handleSwitchToDevotionalPray}
            onComplete={handleDevotionalComplete}
          />
        </div>

        <div
          className="relative z-10"
          role="tabpanel"
          id="tabpanel-pray"
          aria-labelledby="tab-pray"
          tabIndex={0}
          hidden={activeTab !== 'pray'}
        >
          <PrayTabContent
            onSwitchToJournal={handleSwitchToJournal}
            initialContext={urlContext.current}
            prayContext={prayContext}
          />
        </div>

        <div
          className="relative z-10"
          role="tabpanel"
          id="tabpanel-journal"
          aria-labelledby="tab-journal"
          tabIndex={0}
          hidden={activeTab !== 'journal'}
        >
          <JournalTabContent
            prayContext={prayContext}
            onSwitchTab={switchTab}
            urlPrompt={urlPrompt.current}
          />
        </div>

        <div
          className="relative z-10"
          role="tabpanel"
          id="tabpanel-meditate"
          aria-labelledby="tab-meditate"
          tabIndex={0}
          hidden={activeTab !== 'meditate'}
        >
          <MeditateTabContent isActive={activeTab === 'meditate'} />
        </div>

        {/* Today's Song Pick */}
        <div className="relative z-10">
          <SongPickSection />
        </div>

      </main>

      <div className="relative z-10">
        <SiteFooter />
      </div>
      {tabBarTooltip.shouldShow && (
        <TooltipCallout
          targetRef={tabBarRef}
          message={TOOLTIP_DEFINITIONS['daily-hub-tabs'].message}
          tooltipId="daily-hub-tabs"
          position={TOOLTIP_DEFINITIONS['daily-hub-tabs'].position}
          onDismiss={tabBarTooltip.dismiss}
        />
      )}

      {/* Sticky ambient pill FAB */}
      <DailyAmbientPillFAB context={getAmbientContextForTab(activeTab)} />
    </div>
  )
}

// Loading state: use DailyHubSkeleton
export function DailyHub() {
  useRoutePreload([
    () => import('@/pages/BibleLanding'),
  ])
  return <DailyHubContent />
}
