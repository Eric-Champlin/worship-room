import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, Flame } from 'lucide-react'

import { Navbar } from '@/components/Navbar'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SEO } from '@/components/SEO'
import { GROW_METADATA } from '@/lib/seo/routeMetadata'
import { SiteFooter } from '@/components/SiteFooter'
import { ReadingPlansContent } from '@/pages/ReadingPlans'
import { ChallengesContent } from '@/pages/Challenges'
import { getActiveChallengeInfo } from '@/lib/challenge-calendar'
import { CHALLENGES } from '@/data/challenges'
import { Tabs } from '@/components/ui/Tabs'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'
import { cn } from '@/lib/utils'

type TabId = 'plans' | 'challenges'

function isValidTab(value: string | null): value is TabId {
  return value === 'plans' || value === 'challenges'
}

// Loading state: use GrowPageSkeleton
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

  const createParam = searchParams.get('create') === 'true'

  return (
    <BackgroundCanvas className="flex min-h-screen flex-col font-sans">
      <SEO {...GROW_METADATA} />
      <Navbar transparent />

      <main id="main-content">
        {/* Hero Section */}
        <section
          aria-labelledby="grow-heading"
          className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
        >
          <CinematicHeroBackground />
          <h1
            id="grow-heading"
            className="relative z-10 mb-1 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
            style={GRADIENT_TEXT_STYLE}
          >
            Grow in Faith
          </h1>
          <p className="relative z-10 mt-2 text-base text-white/70 leading-relaxed sm:text-lg">
            Structured journeys to deepen your walk with God
          </p>
        </section>

        {/* Sentinel for sticky tab bar shadow */}
        <div ref={sentinelRef} aria-hidden="true" />

        {/* Sticky Tab Bar */}
        <div
          className={cn(
            'sticky top-0 z-40 backdrop-blur-md transition-shadow duration-base motion-reduce:transition-none',
            isSticky && 'bg-hero-bg/70 shadow-md shadow-black/20',
          )}
        >
          <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4">
            <Tabs
              ariaLabel="Grow in Faith sections"
              activeId={activeTab}
              onChange={(id) => switchTab(id as TabId)}
              items={[
                {
                  id: 'plans',
                  label: 'Reading Plans',
                  icon: <BookOpen className="h-4 w-4 text-sky-300" aria-hidden="true" />,
                },
                {
                  id: 'challenges',
                  label: 'Challenges',
                  icon: <Flame className="h-4 w-4 text-amber-300" aria-hidden="true" />,
                  badge: activeChallengeInfo ? (
                    <span
                      className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-challenge-pulse"
                      style={{ backgroundColor: activeChallengeThemeColor }}
                      aria-hidden="true"
                    />
                  ) : undefined,
                },
              ]}
            />
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
    </BackgroundCanvas>
  )
}
