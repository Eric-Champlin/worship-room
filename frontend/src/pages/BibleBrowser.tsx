import { useState } from 'react'

import { Layout } from '@/components/Layout'
import { BibleBooksMode } from '@/components/bible/BibleBooksMode'
import { BibleSearchMode } from '@/components/bible/BibleSearchMode'
import { HighlightsNotesSection } from '@/components/bible/HighlightsNotesSection'
import { SegmentedControl } from '@/components/bible/SegmentedControl'
import type { BibleBrowserMode } from '@/components/bible/SegmentedControl'
import { useAuth } from '@/hooks/useAuth'
import { useBibleHighlights } from '@/hooks/useBibleHighlights'
import { useBibleNotes } from '@/hooks/useBibleNotes'

const BIBLE_HERO_STYLE = {
  backgroundImage:
    'radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)',
  backgroundSize: '100% 100%',
} as const

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
      <div className="min-h-screen bg-hero-dark">
        {/* Hero section */}
        <section
          aria-labelledby="bible-hero-heading"
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-10"
          style={BIBLE_HERO_STYLE}
        >
          <h1
            id="bible-hero-heading"
            className="font-script text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl"
          >
            Bible
          </h1>
          <p className="mx-auto mt-3 max-w-xl font-serif text-base italic text-white/85 sm:text-lg lg:text-xl">
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
