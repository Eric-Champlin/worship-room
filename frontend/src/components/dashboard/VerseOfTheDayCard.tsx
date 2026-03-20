import { useState, useRef, useCallback } from 'react'
import { Share2 } from 'lucide-react'
import { getTodaysVerse } from '@/constants/verse-of-the-day'
import { VerseSharePanel } from '@/components/verse-of-the-day/VerseSharePanel'

export function VerseOfTheDayCard() {
  const verse = getTodaysVerse()
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const shareBtnRef = useRef<HTMLButtonElement>(null)
  const handleClosePanel = useCallback(() => setSharePanelOpen(false), [])

  return (
    <div>
      <p className="font-serif italic text-lg leading-relaxed text-white">
        &ldquo;{verse.text}&rdquo;
      </p>
      <p className="mt-2 text-sm text-white/50">{verse.reference}</p>
      <div className="relative mt-3 flex justify-end">
        <button
          ref={shareBtnRef}
          type="button"
          onClick={() => setSharePanelOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-sm text-white/40 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Share verse of the day"
          aria-haspopup="menu"
          aria-expanded={sharePanelOpen}
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
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
  )
}
