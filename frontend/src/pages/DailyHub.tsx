import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams, useLocation, Link } from 'react-router-dom'
import { Heart, PenLine, Wind, BookOpen, Check, Share2, ChevronRight } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { SiteFooter } from '@/components/SiteFooter'
import { SongPickSection } from '@/components/SongPickSection'
import { StartingPointQuiz } from '@/components/StartingPointQuiz'
import { PrayTabContent } from '@/components/daily/PrayTabContent'
import { JournalTabContent } from '@/components/daily/JournalTabContent'
import { MeditateTabContent } from '@/components/daily/MeditateTabContent'
import { DevotionalTabContent } from '@/components/daily/DevotionalTabContent'
import { SharePanel } from '@/components/sharing/SharePanel'
import { getTodaysVerse } from '@/constants/verse-of-the-day'
import { getTodaysDevotional } from '@/data/devotionals'
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

function formatTheme(theme: string): string {
  return theme
    .split('-')
    .map(w => w === 'and' ? '&' : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
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
  const devotional = getTodaysDevotional()

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
    } catch { return false }
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

  // Tab underline position
  const activeTabIndex = TABS.findIndex((t) => t.id === activeTab)

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
    <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
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
        <section
          aria-labelledby="daily-hub-heading"
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
          style={ATMOSPHERIC_HERO_BG}
        >
          <h1
            id="daily-hub-heading"
            className="mb-1 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
          >
            {displayName}
          </h1>

          {/* Two Content Cards */}
          <div className="mt-6 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Left Card — Today's Verse */}
            <div className="relative rounded-xl border border-white/10 bg-white/[0.08] p-5 text-left backdrop-blur-sm sm:min-h-[140px]">
              <Link
                to={verseLink}
                className="block transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <p className="pr-6 font-serif italic text-lg text-white/90 line-clamp-3 sm:line-clamp-4">
                  &ldquo;{verse.text}&rdquo;
                </p>
                <p className="mt-2 text-sm text-white/50">
                  — {verse.reference}
                </p>
              </Link>
              <Link
                to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}`}
                className="mt-1 block text-sm text-primary-lt transition-colors hover:text-primary"
              >
                Meditate on this verse &gt;
              </Link>
              <button
                type="button"
                onClick={() => setSharePanelOpen(true)}
                className="absolute bottom-5 right-5 rounded p-1 text-white/40 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Share verse of the day"
                aria-haspopup="dialog"
                aria-expanded={sharePanelOpen}
              >
                <Share2 className="h-4 w-4" />
              </button>
              <SharePanel
                verseText={verse.text}
                reference={verse.reference}
                isOpen={sharePanelOpen}
                onClose={() => setSharePanelOpen(false)}
              />
            </div>

            {/* Right Card — Today's Devotional */}
            <button
              type="button"
              onClick={() => switchTab('devotional')}
              className="block w-full rounded-xl border border-white/10 bg-white/[0.08] p-5 text-left backdrop-blur-sm transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:min-h-[140px]"
            >
              <p className="text-xs uppercase tracking-wide text-primary-lt">
                Daily Devotional
              </p>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {devotional.title}
                </h2>
                {hasReadDevotional && (
                  <>
                    <Check className="h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
                    <span className="sr-only">Already read today</span>
                  </>
                )}
              </div>
              <span className="mt-2 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/50">
                {formatTheme(devotional.theme)}
              </span>
              <p className="mt-3 flex items-center gap-1 text-sm text-primary-lt">
                Read today&apos;s devotional <ChevronRight className="h-3 w-3" />
              </p>
            </button>
          </div>

          {/* Quiz Teaser */}
          <p className="mt-4 font-sans text-sm text-white/50">
            Not sure where to start?{' '}
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById('quiz')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="rounded font-semibold text-white/50 underline underline-offset-2 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              Take a 30-second quiz
            </button>{' '}
            and we&apos;ll help you find your path.
          </p>
        </section>

        {/* Sentinel for sticky tab bar shadow */}
        <div ref={sentinelRef} aria-hidden="true" />

        {/* Sticky Tab Bar */}
        <div
          className={cn(
            'sticky top-0 z-40 bg-white/[0.08] backdrop-blur-xl transition-shadow',
            isSticky && 'shadow-md shadow-black/20',
          )}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-center border-b border-white/10">
            <div
              ref={tabBarRef}
              className="relative flex w-full"
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
                      'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark sm:py-4 sm:text-base',
                      isActive
                        ? 'text-white'
                        : 'text-white/60 hover:text-white/80',
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
              {/* Animated underline */}
              <div
                className="absolute bottom-0 h-0.5 bg-primary transition-transform duration-200 ease-in-out"
                style={{
                  width: `${100 / TABS.length}%`,
                  transform: `translateX(${activeTabIndex * 100}%)`,
                }}
                aria-hidden="true"
              />
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
          className="motion-safe:animate-tab-fade-in"
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
          className="motion-safe:animate-tab-fade-in"
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
          className="motion-safe:animate-tab-fade-in"
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
          className="motion-safe:animate-tab-fade-in"
        >
          <MeditateTabContent />
        </div>

        {/* Today's Song Pick */}
        <SongPickSection />

        {/* Starting Point Quiz */}
        <StartingPointQuiz variant="dark" />
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

export function DailyHub() {
  useRoutePreload([
    () => import('@/pages/BibleBrowser'),
  ])
  return <DailyHubContent />
}
