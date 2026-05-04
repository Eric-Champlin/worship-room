import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
        to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}&verseText=${encodeURIComponent(verse.text)}&verseTheme=${encodeURIComponent(verse.theme)}`}
        className="mt-1 block text-sm text-white/80 transition-colors hover:text-white"
      >
        Meditate on this verse &gt;
      </Link>
      <div className="mt-3 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => setSharePanelOpen((prev) => !prev)}
          aria-label="Share verse of the day"
          aria-haspopup="dialog"
          aria-expanded={sharePanelOpen}
          className="min-h-[44px] gap-1.5"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          <span>Share</span>
        </Button>
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
