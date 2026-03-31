import { Link } from 'react-router-dom'
import { HandHeart, MessageCircleQuestion, PenLine, Wind } from 'lucide-react'

interface ChapterEngagementBridgeProps {
  bookName: string
  chapterNumber: number
}

function getChapterDisplayName(bookName: string, chapter: number): string {
  const displayName = bookName === 'Psalms' ? 'Psalm' : bookName
  return `${displayName} ${chapter}`
}

const BUTTON_CLASS =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:w-auto'

export function ChapterEngagementBridge({
  bookName,
  chapterNumber,
}: ChapterEngagementBridgeProps) {
  const displayName = getChapterDisplayName(bookName, chapterNumber)

  return (
    <section aria-labelledby="engagement-bridge-heading" className="mt-12 border-t border-white/10 pt-8 pb-4">
      <p id="engagement-bridge-heading" className="mb-4 text-center text-sm text-white/60 sm:text-base">
        Continue your time with {displayName}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center">
        <Link
          to={`/daily?tab=journal&prompt=${encodeURIComponent(`Journal about what stood out to you in ${displayName}`)}`}
          className={BUTTON_CLASS}
        >
          <PenLine size={18} aria-hidden="true" />
          Journal
        </Link>
        <Link
          to={`/daily?tab=pray&context=${encodeURIComponent(`Pray about what you read in ${displayName}`)}`}
          className={BUTTON_CLASS}
        >
          <HandHeart size={18} aria-hidden="true" />
          Pray
        </Link>
        <Link
          to={`/ask?q=${encodeURIComponent(`What does ${displayName} mean and how can I apply it to my life?`)}`}
          className={BUTTON_CLASS}
        >
          <MessageCircleQuestion size={18} aria-hidden="true" />
          Ask
        </Link>
        <Link to="/daily?tab=meditate" className={BUTTON_CLASS}>
          <Wind size={18} aria-hidden="true" />
          Meditate
        </Link>
      </div>
    </section>
  )
}
