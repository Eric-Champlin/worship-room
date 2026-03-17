import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Heart, PenLine, Wind, Check } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { SongPickSection } from '@/components/SongPickSection'
import { StartingPointQuiz } from '@/components/StartingPointQuiz'
import { PrayTabContent } from '@/components/daily/PrayTabContent'
import { JournalTabContent } from '@/components/daily/JournalTabContent'
import { MeditateTabContent } from '@/components/daily/MeditateTabContent'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { PrayContext } from '@/types/daily-experience'

const TABS = [
  { id: 'pray', label: 'Pray', icon: Heart },
  { id: 'journal', label: 'Journal', icon: PenLine },
  { id: 'meditate', label: 'Meditate', icon: Wind },
] as const

type TabId = (typeof TABS)[number]['id']

function isValidTab(value: string | null): value is TabId {
  return value === 'pray' || value === 'journal' || value === 'meditate'
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
  const activeTab: TabId = isValidTab(rawTab) ? rawTab : 'pray'

  const { user, isAuthenticated } = useAuth()
  const { isPrayComplete, isJournalComplete, isMeditateComplete } =
    useCompletionTracking()

  const [prayContext, setPrayContext] = useState<PrayContext | null>(null)

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

  const greeting = getGreeting()
  const displayName = user ? `${greeting}, ${user.name}!` : `${greeting}!`

  const completionMap: Record<string, boolean> = {
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
    <div className="flex min-h-screen flex-col bg-neutral-bg font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navbar transparent />

      <main id="main-content">
        {/* Hero Section — Greeting */}
        <section
          aria-labelledby="daily-hub-heading"
          className="relative flex w-full flex-col items-center px-4 pb-10 pt-32 text-center antialiased sm:pb-12 sm:pt-36 lg:pb-14 lg:pt-40"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)',
          }}
        >
          <h1
            id="daily-hub-heading"
            className="mb-1 font-script text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl"
          >
            {displayName}
          </h1>
          <p className="text-base text-white/80">
            Start with any practice below.
          </p>
          <p className="mt-2 font-sans text-sm text-white/90">
            Not sure where to start?{' '}
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById('quiz')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="rounded font-semibold text-white underline underline-offset-2 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
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
            'sticky top-0 z-40 bg-neutral-bg transition-shadow',
            isSticky && 'shadow-md',
          )}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-center border-b border-gray-200">
            <div
              className="relative flex w-full"
              role="tablist"
              aria-label="Daily practices"
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
                      'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:py-4 sm:text-base',
                      isActive
                        ? 'text-primary'
                        : 'text-text-light hover:text-text-dark',
                    )}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    {tab.label}
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
          id="tabpanel-pray"
          aria-labelledby="tab-pray"
          tabIndex={0}
          hidden={activeTab !== 'pray'}
        >
          <PrayTabContent
            onSwitchToJournal={handleSwitchToJournal}
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

        {/* Starting Point Quiz */}
        <StartingPointQuiz variant="light" />
      </main>

      <SiteFooter />
    </div>
  )
}

export function DailyHub() {
  return <DailyHubContent />
}
