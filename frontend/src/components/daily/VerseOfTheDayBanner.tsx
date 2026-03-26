import { useState, useRef, useCallback } from 'react'
import { Share2 } from 'lucide-react'
import { getTodaysVerse } from '@/constants/verse-of-the-day'
import { VerseSharePanel } from '@/components/verse-of-the-day/VerseSharePanel'
import { VerseLink } from '@/components/shared/VerseLink'

export function VerseOfTheDayBanner() {
  const verse = getTodaysVerse()
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const shareBtnRef = useRef<HTMLButtonElement>(null)
  const handleClosePanel = useCallback(() => setSharePanelOpen(false), [])

  return (
    <div className="mx-4 mb-2 sm:mx-6">
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <div className="min-w-0 flex-1">
          <p className="font-serif italic text-sm text-white/80 line-clamp-1 sm:line-clamp-none">
            &ldquo;{verse.text}&rdquo;
          </p>
          <p className="mt-0.5 text-xs sm:mt-0 sm:ml-2 sm:inline">
            —{' '}
            <VerseLink
              reference={verse.reference}
              className="text-white/40"
            />
          </p>
        </div>
        <div className="relative flex-shrink-0">
          <button
            ref={shareBtnRef}
            type="button"
            onClick={() => setSharePanelOpen((prev) => !prev)}
            className="rounded-lg p-3 text-white/40 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Share verse of the day"
            aria-haspopup="menu"
            aria-expanded={sharePanelOpen}
          >
            <Share2 className="h-5 w-5" />
          </button>
          <VerseSharePanel
            verseText={verse.text}
            verseReference={verse.reference}
            isOpen={sharePanelOpen}
            onClose={handleClosePanel}
            triggerRef={shareBtnRef}
          />
        </div>
      </div>
    </div>
  )
}
