import { Link } from 'react-router-dom'
import { CheckCircle, X } from 'lucide-react'
import { BIBLE_BOOKS } from '@/constants/bible'

interface BookCompletionCardProps {
  bookName: string
  bookSlug: string
  onDismiss: () => void
}

export function BookCompletionCard({
  bookName,
  bookSlug,
  onDismiss,
}: BookCompletionCardProps) {
  const currentIndex = BIBLE_BOOKS.findIndex((b) => b.slug === bookSlug)
  const nextBook = currentIndex >= 0 && currentIndex < BIBLE_BOOKS.length - 1
    ? BIBLE_BOOKS[currentIndex + 1]
    : null

  return (
    <div className="relative mt-4 rounded-xl border border-success/30 bg-success/10 p-4">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded p-1 text-white/50 transition-colors hover:text-white/70"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2">
        <CheckCircle className="h-6 w-6 shrink-0 text-success" />
        <span className="font-semibold text-white">
          You've completed {bookName}!
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2 pl-8 sm:flex-row">
        <Link
          to="/insights"
          className="text-sm text-primary-lt transition-colors hover:text-primary hover:underline"
        >
          View your reading progress →
        </Link>
        {nextBook && (
          <Link
            to={`/bible/${nextBook.slug}/1`}
            className="text-sm text-primary-lt transition-colors hover:text-primary hover:underline"
          >
            Start the next book →
          </Link>
        )}
      </div>
    </div>
  )
}
