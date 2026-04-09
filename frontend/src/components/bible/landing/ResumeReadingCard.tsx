import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'

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
    <FrostedCard
      as="article"
      className="border-l-4 border-l-primary/60 shadow-[0_0_35px_rgba(139,92,246,0.12),0_4px_25px_rgba(0,0,0,0.35)]"
    >
      <p className="text-xs font-medium uppercase tracking-widest text-white/60">
        Continue reading
      </p>
      <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
        {book} {chapter}
      </h3>
      {firstLine && (
        <p className="mt-2 line-clamp-1 text-sm text-white/70 sm:text-base">{firstLine}</p>
      )}
      <p className="mt-1 text-xs text-white/50 sm:text-sm">Read {relativeTime.toLowerCase()}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Link
          to={`/bible/${slug}/${chapter}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          aria-label={`Continue reading ${book} chapter ${chapter}`}
        >
          Continue
        </Link>
        {nextChapter && (
          <Link
            to={`/bible/${nextChapter.bookSlug}/${nextChapter.chapter}`}
            className="inline-flex min-h-[44px] items-center text-sm text-primary-lt transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          >
            Or read the next chapter
          </Link>
        )}
      </div>
    </FrostedCard>
  )
}
