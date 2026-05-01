import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { Button } from '@/components/ui/Button'

interface ResumeReadingCardProps {
  book: string
  chapter: number
  slug: string
  relativeTime: string
  firstLine: string | null
  nextChapter: { bookSlug: string; bookName: string; chapter: number } | null
}

export function ResumeReadingCard({
  book,
  chapter,
  slug,
  relativeTime,
  firstLine,
  nextChapter,
}: ResumeReadingCardProps) {
  return (
    <FrostedCard as="article" variant="accent" eyebrow="Pick up where you left off">
      <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
        {book} {chapter}
      </h3>
      {firstLine && (
        <p className="mt-2 line-clamp-1 text-sm text-white/70 sm:text-base">{firstLine}</p>
      )}
      <p className="mt-1 text-xs text-white/50 sm:text-sm">Read {relativeTime.toLowerCase()}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button variant="gradient" size="md" asChild>
          <Link to={`/bible/${slug}/${chapter}`}>
            Continue reading {book} {chapter}
          </Link>
        </Button>
        {nextChapter && (
          <Link
            to={`/bible/${nextChapter.bookSlug}/${nextChapter.chapter}`}
            className="inline-flex min-h-[44px] items-center text-sm text-white transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          >
            Or read the next chapter
          </Link>
        )}
      </div>
    </FrostedCard>
  )
}
