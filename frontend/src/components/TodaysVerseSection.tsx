import { useState, useCallback } from 'react'
import { getTodaysVerse } from '@/constants/verse-of-the-day'
import { SharePanel } from '@/components/sharing/SharePanel'
import { VerseLink } from '@/components/shared/VerseLink'

export function TodaysVerseSection() {
  const verse = getTodaysVerse()
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const handleClosePanel = useCallback(() => setSharePanelOpen(false), [])

  return (
    <section
      aria-labelledby="todays-verse-heading"
      className="bg-hero-dark py-16 sm:py-20"
    >
      <div className="mx-auto max-w-3xl px-4 text-center">
        <p
          id="todays-verse-heading"
          className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40"
        >
          Today&apos;s Verse
        </p>
        <blockquote>
          <p className="mx-auto max-w-2xl font-serif italic text-lg leading-relaxed text-white sm:text-2xl">
            &ldquo;{verse.text}&rdquo;
          </p>
          <cite className="mt-3 block text-sm not-italic">
            —{' '}
            <VerseLink
              reference={verse.reference}
              className="text-white/50"
            />
          </cite>
        </blockquote>
        <div className="mt-8 inline-block">
          <button
            type="button"
            onClick={() => setSharePanelOpen((prev) => !prev)}
            className="rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
            aria-haspopup="dialog"
            aria-expanded={sharePanelOpen}
          >
            Share this verse
          </button>
        </div>
      </div>
      <SharePanel
        verseText={verse.text}
        reference={verse.reference}
        isOpen={sharePanelOpen}
        onClose={handleClosePanel}
      />
    </section>
  )
}
