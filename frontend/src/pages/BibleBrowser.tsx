import { useState } from 'react'

import { Layout } from '@/components/Layout'
import { BibleBooksMode } from '@/components/bible/BibleBooksMode'
import { BibleSearchMode } from '@/components/bible/BibleSearchMode'
import { HighlightsNotesSection } from '@/components/bible/HighlightsNotesSection'
import { SegmentedControl } from '@/components/bible/SegmentedControl'
import type { BibleBrowserMode } from '@/components/bible/SegmentedControl'
import { SEO, SITE_URL } from '@/components/SEO'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { useAuth } from '@/hooks/useAuth'
const bibleBreadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Bible' },
  ],
}
import { useBibleHighlights } from '@/hooks/useBibleHighlights'
import { useBibleNotes } from '@/hooks/useBibleNotes'


export function BibleBrowser() {
  const [mode, setMode] = useState<BibleBrowserMode>('books')
  const { isAuthenticated } = useAuth()
  const { getAllHighlights } = useBibleHighlights()
  const { getAllNotes } = useBibleNotes()

  const highlights = getAllHighlights()
  const notes = getAllNotes()
  const hasAnnotations = highlights.length > 0 || notes.length > 0

  return (
    <Layout>
      <SEO title="Read the Bible (WEB)" description="Read the full World English Bible with highlighting, notes, and audio playback." jsonLd={bibleBreadcrumbs} />
      <div className="min-h-screen bg-dashboard-dark">
        {/* Hero section */}
        <section
          aria-labelledby="bible-hero-heading"
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
          style={ATMOSPHERIC_HERO_BG}
        >
          <h1
            id="bible-hero-heading"
            className="font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
          >
            Bible
          </h1>
          <p className="mx-auto mt-3 max-w-xl font-serif italic text-base text-white/60 sm:text-lg">
            The Word of God
          </p>
        </section>

        {/* Content area */}
        <div className="mx-auto max-w-4xl px-4 pb-16">
          <SegmentedControl mode={mode} onModeChange={setMode} />
          {mode === 'books' ? <BibleBooksMode /> : <BibleSearchMode />}

          {/* My Highlights & Notes section */}
          {isAuthenticated && hasAnnotations && (
            <HighlightsNotesSection
              highlights={highlights}
              notes={notes}
            />
          )}
        </div>
      </div>
    </Layout>
  )
}
