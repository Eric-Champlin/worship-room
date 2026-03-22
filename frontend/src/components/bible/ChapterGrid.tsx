import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

interface ChapterGridProps {
  bookSlug: string
  totalChapters: number
  hasFullText: boolean
  completedChapters: number[]
  isAuthenticated: boolean
}

export function ChapterGrid({
  bookSlug,
  totalChapters,
  hasFullText,
  completedChapters,
  isAuthenticated,
}: ChapterGridProps) {
  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1)

  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
      {chapters.map((chapter) => {
        const isRead = isAuthenticated && completedChapters.includes(chapter)
        const ariaLabel = isRead
          ? `Chapter ${chapter} — read`
          : `Chapter ${chapter}`

        return (
          <Link
            key={chapter}
            to={`/bible/${bookSlug}/${chapter}`}
            aria-label={ariaLabel}
            className={cn(
              'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-sm font-medium transition-colors',
              isRead
                ? 'border border-primary/30 bg-primary/20 text-white'
                : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
              !hasFullText && 'opacity-60',
            )}
          >
            {chapter}
          </Link>
        )
      })}
    </div>
  )
}
