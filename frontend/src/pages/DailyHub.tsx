import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams, useLocation, Link } from 'react-router-dom'
import { Heart, PenLine, Wind, BookOpen, Check, Share2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SiteFooter } from '@/components/SiteFooter'
import { SongPickSection } from '@/components/SongPickSection'
import { PrayTabContent } from '@/components/daily/PrayTabContent'
import { JournalTabContent } from '@/components/daily/JournalTabContent'
import { MeditateTabContent } from '@/components/daily/MeditateTabContent'
import { DevotionalTabContent } from '@/components/daily/DevotionalTabContent'
import { SharePanel } from '@/components/sharing/SharePanel'
import { getTodaysVerse } from '@/constants/verse-of-the-day'
import { parseVerseReferences } from '@/lib/parse-verse-references'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useAuth } from '@/hooks/useAuth'
import { useTooltipCallout } from '@/hooks/useTooltipCallout'
import { TooltipCallout } from '@/components/ui/TooltipCallout'
import { TOOLTIP_DEFINITIONS } from '@/constants/tooltips'
import { SEO, SITE_URL } from '@/components/SEO'
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
import type { PrayContext } from '@/types/daily-experience'

const TABS = [
  { id: 'devotional', label: 'Devotional', mobileLabel: 'Devos', icon: BookOpen },
  { id: 'pray', label: 'Pray', mobileLabel: 'Pray', icon: Heart },
  { id: 'journal', label: 'Journal', mobileLabel: 'Journal', icon: PenLine },
  { id: 'meditate', label: 'Meditate', mobileLabel: 'Meditate', icon: Wind },
] as const

type TabId = (typeof TABS)[number]['id']

function isValidTab(value: string | null): value is TabId {
  return value === 'devotional' || value === 'pray' || value === 'journal' || value === 'meditate'
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function DailyHubContent() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: TabId = isValidTab(rawTab) ? rawTab : 'devotional'

  const { user, isAuthenticated } = useAuth()
  const { isPrayComplete, isJournalComplete, isMeditateComplete } =
    useCompletionTracking()

  const [prayContext, setPrayContext] = useState<PrayContext | null>(null)

  // Hero content data
  const verse = getTodaysVerse()

  const parsedRefs = parseVerseReferences(verse.reference)
  const verseLink = parsedRefs.length > 0
    ? `/bible/${parsedRefs[0].bookSlug}/${parsedRefs[0].chapter}`
    : '/bible'

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

  const [sharePanelOpen, setSharePanelOpen] = useState(false)

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
      setSearchParams({ tab }, { replace: true })
    },
    [setSearchParams],
  )

  const handleSwitchToJournal = useCallback(
    (topic: string) => {
      setPrayContext({ from: 'pray', topic })
      setSearchParams({ tab: 'journal' }, { replace: true })
    },
    [setSearchParams],
  )

  const handleSwitchToDevotionalJournal = useCallback(
    (topic: string) => {
      setPrayContext({ from: 'devotional', topic })
      setSearchParams({ tab: 'journal' }, { replace: true })
    },
    [setSearchParams],
  )

  const handleSwitchToDevotionalPray = useCallback(
    (context: string) => {
      setPrayContext({ from: 'devotional', topic: context })
      setSearchParams({ tab: 'pray' }, { replace: true })
    },
    [setSearchParams],
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
    <div className="flex min-h-screen flex-col bg-hero-bg font-sans">
      <SEO title="Daily Prayer, Journal & Meditation" description="Start your day with AI-powered prayer, guided journaling, and Christian meditation rooted in Scripture." jsonLd={dailyHubBreadcrumbs} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navbar transparent />

      <main id="main-content">
        {/* Hero Section — Greeting + Content Cards */}
        <GlowBackground variant="center">
          <section
            aria-labelledby="daily-hub-heading"
            className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
          >
          <h1
            id="daily-hub-heading"
            className="mb-1 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
            style={GRADIENT_TEXT_STYLE}
          >
            {displayName}
          </h1>

          {/* Verse of the Day — Full-Width Banner */}
          <FrostedCard className="mt-6 w-full max-w-2xl rounded-xl px-5 py-4 text-left">
            <Link
              to={verseLink}
              className="block transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:rounded"
            >
              <p className="font-serif italic text-base leading-relaxed text-white/80 line-clamp-2 sm:text-lg sm:line-clamp-none">
                &ldquo;{verse.text}&rdquo;
              </p>
            </Link>
            <p className="mt-2 text-sm text-white/60">
              — {verse.reference}
            </p>
            <div className="mt-3 flex items-center gap-4">
              <Link
                to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}`}
                className="inline-flex min-h-[44px] items-center text-sm text-primary-lt transition-colors hover:text-primary"
              >
                Meditate on this verse &gt;
              </Link>
              <button
                type="button"
                onClick={() => setSharePanelOpen(true)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-1 text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Share verse of the day"
                aria-haspopup="dialog"
                aria-expanded={sharePanelOpen}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            <SharePanel
              verseText={verse.text}
              reference={verse.reference}
              isOpen={sharePanelOpen}
              onClose={() => setSharePanelOpen(false)}
            />
          </FrostedCard>

          </section>
        </GlowBackground>

        {/* Sentinel for sticky tab bar shadow */}
        <div ref={sentinelRef} aria-hidden="true" />

        {/* Sticky Tab Bar */}
        <div
          className={cn(
            'sticky top-0 z-40 bg-hero-bg/85 backdrop-blur-lg transition-shadow',
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
                      'flex flex-1 items-center justify-center gap-2 rounded-full min-h-[44px] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg sm:text-base',
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
          role="tabpanel"
          id="tabpanel-pray"
          aria-labelledby="tab-pray"
          tabIndex={0}
          hidden={activeTab !== 'pray'}
        >
          <PrayTabContent
            onSwitchToJournal={handleSwitchToJournal}
            initialContext={urlContext.current}
          />
        </div>

        <div
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
          role="tabpanel"
          id="tabpanel-meditate"
          aria-labelledby="tab-meditate"
          tabIndex={0}
          hidden={activeTab !== 'meditate'}
        >
          <MeditateTabContent />
        </div>

        {/* Today's Song Pick */}
        <SongPickSection />

      </main>

      <SiteFooter />
      {tabBarTooltip.shouldShow && (
        <TooltipCallout
          targetRef={tabBarRef}
          message={TOOLTIP_DEFINITIONS['daily-hub-tabs'].message}
          tooltipId="daily-hub-tabs"
          position={TOOLTIP_DEFINITIONS['daily-hub-tabs'].position}
          onDismiss={tabBarTooltip.dismiss}
        />
      )}
    </div>
  )
}

// Loading state: use DailyHubSkeleton
export function DailyHub() {
  useRoutePreload([
    () => import('@/pages/BibleBrowser'),
  ])
  return <DailyHubContent />
}
