import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ChapterNavProps {
  bookSlug: string
  currentChapter: number
  totalChapters: number
}

export function ChapterNav({
  bookSlug,
  currentChapter,
  totalChapters,
}: ChapterNavProps) {
  const hasPrevious = currentChapter > 1
  const hasNext = currentChapter < totalChapters

  return (
    <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      {hasPrevious ? (
        <Link
          to={`/bible/${bookSlug}/${currentChapter - 1}`}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/15"
        >
          <ChevronLeft size={16} />
          Previous Chapter
        </Link>
      ) : (
        <div />
      )}

      {hasNext ? (
        <Link
          to={`/bible/${bookSlug}/${currentChapter + 1}`}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/15"
        >
          Next Chapter
          <ChevronRight size={16} />
        </Link>
      ) : (
        <div />
      )}
    </div>
  )
}
