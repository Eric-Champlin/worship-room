import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Share2 } from 'lucide-react'
import { getTodaysVerse } from '@/constants/verse-of-the-day'
import { SharePanel } from '@/components/sharing/SharePanel'

export function VerseOfTheDayCard() {
  const verse = getTodaysVerse()
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const handleClosePanel = useCallback(() => setSharePanelOpen(false), [])

  return (
    <div>
      <p className="font-serif italic text-lg leading-relaxed text-white">
        &ldquo;{verse.text}&rdquo;
      </p>
      <p className="mt-2 text-sm text-white/50">{verse.reference}</p>
      <Link
        to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}`}
        className="mt-1 block text-sm text-primary-lt transition-colors hover:text-primary"
      >
        Meditate on this verse &gt;
      </Link>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setSharePanelOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-sm text-white/40 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Share verse of the day"
          aria-haspopup="dialog"
          aria-expanded={sharePanelOpen}
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
      </div>
      <SharePanel
        verseText={verse.text}
        reference={verse.reference}
        isOpen={sharePanelOpen}
        onClose={handleClosePanel}
      />
    </div>
  )
}
