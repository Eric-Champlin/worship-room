import { Link } from 'react-router-dom'
import { useLastRead } from '@/hooks/bible/useLastRead'
import { ResumeReadingCard } from './ResumeReadingCard'
import { VerseOfTheDay } from './VerseOfTheDay'

export function BibleHeroSlot() {
  const {
    book,
    chapter,
    slug,
    relativeTime,
    firstLineOfChapter,
    nextChapter,
    isActiveReader,
    isLapsedReader,
  } = useLastRead()

  // Active reader: resume card primary, VOTD secondary
  if (isActiveReader && book && chapter && slug) {
    return (
      <div className="space-y-6">
        <ResumeReadingCard
          book={book}
          chapter={chapter}
          slug={slug}
          relativeTime={relativeTime}
          firstLine={firstLineOfChapter}
          nextChapter={nextChapter}
        />
        <VerseOfTheDay />
      </div>
    )
  }

  // Lapsed reader: VOTD primary, resume link secondary
  if (isLapsedReader && book && chapter && slug) {
    return (
      <div className="space-y-4">
        <VerseOfTheDay />
        <Link
          to={`/bible/${slug}/${chapter}`}
          className="flex min-h-[44px] items-center justify-center text-center text-sm"
        >
          <span className="text-white/50">Last read: </span>
          <span className="font-medium text-white/70">
            {book} {chapter}
          </span>
          <span className="text-white/50"> · {relativeTime}</span>
        </Link>
      </div>
    )
  }

  // First-time reader: VOTD only
  return <VerseOfTheDay />
}
