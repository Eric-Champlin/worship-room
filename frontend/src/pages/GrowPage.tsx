import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, Flame } from 'lucide-react'

import { Navbar } from '@/components/Navbar'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { SEO } from '@/components/SEO'
import { SiteFooter } from '@/components/SiteFooter'
import { ReadingPlansContent } from '@/pages/ReadingPlans'
import { ChallengesContent } from '@/pages/Challenges'
import { getActiveChallengeInfo } from '@/lib/challenge-calendar'
import { CHALLENGES } from '@/data/challenges'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'plans', label: 'Reading Plans', icon: BookOpen },
  { id: 'challenges', label: 'Challenges', icon: Flame },
] as const

type TabId = (typeof TABS)[number]['id']

function isValidTab(value: string | null): value is TabId {
  return value === 'plans' || value === 'challenges'
}

export function GrowPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: TabId = isValidTab(rawTab) ? rawTab : 'plans'

  const activeChallengeInfo = getActiveChallengeInfo()
  const activeChallengeThemeColor = activeChallengeInfo
    ? CHALLENGES.find((c) => c.id === activeChallengeInfo.challengeId)?.themeColor
    : undefined

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

  // Tab underline position
  const activeTabIndex = TABS.findIndex((t) => t.id === activeTab)

  const createParam = searchParams.get('create') === 'true'

  return (
    <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
      <SEO
        title="Grow in Faith"
        description="Discover Bible reading plans and seasonal community challenges to deepen your walk with God."
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navbar transparent />

      <main id="main-content">
        {/* Hero Section */}
        <section
          aria-labelledby="grow-heading"
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-10 lg:pt-40 lg:pb-12"
          style={ATMOSPHERIC_HERO_BG}
        >
          <h1
            id="grow-heading"
            className="mb-1 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
          >
            Grow in Faith
          </h1>
          <p className="mt-2 font-serif italic text-base text-white/60 sm:text-lg">
            Structured journeys to deepen your walk with God
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
              className="relative flex w-full"
              role="tablist"
              aria-label="Grow in Faith sections"
            >
              {TABS.map((tab, index) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon
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
                    {tab.label}
                    {tab.id === 'challenges' && activeChallengeInfo && (
                      <span
                        className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-challenge-pulse"
                        style={{ backgroundColor: activeChallengeThemeColor }}
                        aria-hidden="true"
                      />
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

        {/* Tab Panels — all mounted, CSS show/hide for state preservation */}
        <div
          role="tabpanel"
          id="tabpanel-plans"
          aria-labelledby="tab-plans"
          tabIndex={0}
          hidden={activeTab !== 'plans'}
          className="motion-safe:animate-tab-fade-in"
        >
          <ReadingPlansContent createParam={createParam} />
        </div>

        <div
          role="tabpanel"
          id="tabpanel-challenges"
          aria-labelledby="tab-challenges"
          tabIndex={0}
          hidden={activeTab !== 'challenges'}
          className="motion-safe:animate-tab-fade-in"
        >
          <ChallengesContent />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
