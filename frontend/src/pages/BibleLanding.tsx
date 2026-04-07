import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { BooksDrawerContent } from '@/components/bible/BooksDrawerContent'
import { getLastRead, getActivePlans, getBibleStreak } from '@/lib/bible/landingState'
import type { LastRead, ActivePlan, BibleStreak } from '@/types/bible-landing'

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
  const [streak, setStreak] = useState<BibleStreak | null>(null)
  const { isOpen, close, toggle } = useBibleDrawer()
  const navigate = useNavigate()

  useEffect(() => {
    setLastRead(getLastRead())
    setPlans(getActivePlans())
    setStreak(getBibleStreak())
  }, [])

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

  const handleSelectBook = useCallback(
    (slug: string) => {
      navigate(`/bible/${slug}/1`)
      close()
    },
    [navigate, close]
  )

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
          {streak && streak.count > 0 && (
            <div className="flex justify-center">
              <StreakChip streak={streak} onClick={() => console.log('Streak chip clicked')} />
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
        <BooksDrawerContent onClose={close} onSelectBook={handleSelectBook} />
      </BibleDrawer>
    </Layout>
  )
}

export function BibleLanding() {
  return (
    <BibleDrawerProvider>
      <BibleLandingInner />
    </BibleDrawerProvider>
  )
}
