import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { SEO, SITE_URL } from '@/components/SEO'
import { BibleHero } from '@/components/bible/landing/BibleHero'
import { StreakChip } from '@/components/bible/landing/StreakChip'
import { ResumeReadingCard } from '@/components/bible/landing/ResumeReadingCard'
import { TodaysPlanCard } from '@/components/bible/landing/TodaysPlanCard'
import { VerseOfTheDay } from '@/components/bible/landing/VerseOfTheDay'
import { QuickActionsRow } from '@/components/bible/landing/QuickActionsRow'
import { BibleSearchEntry } from '@/components/bible/landing/BibleSearchEntry'
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

export function BibleLanding() {
  const [lastRead, setLastRead] = useState<LastRead | null>(null)
  const [plans, setPlans] = useState<ActivePlan[]>([])
  const [streak, setStreak] = useState<BibleStreak | null>(null)

  useEffect(() => {
    setLastRead(getLastRead())
    setPlans(getActivePlans())
    setStreak(getBibleStreak())
  }, [])

  return (
    <Layout>
      <SEO
        title="Read the Bible (WEB)"
        description="Read the full World English Bible — free, public domain, no account needed. Resume reading, daily verse, reading plans, and more."
        jsonLd={bibleBreadcrumbs}
      />
      <div className="min-h-screen bg-dashboard-dark">
        <BibleHero />

        <div className="mx-auto max-w-4xl space-y-8 px-4 pb-16">
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
    </Layout>
  )
}
