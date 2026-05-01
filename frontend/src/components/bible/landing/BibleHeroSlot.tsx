import { Link } from 'react-router-dom'

import { getBookBySlug } from '@/data/bible'
import { useActivePlan } from '@/hooks/bible/useActivePlan'
import { useLastRead } from '@/hooks/bible/useLastRead'

import { ActivePlanBanner } from './ActivePlanBanner'
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

  const { activePlan, progress, currentDay } = useActivePlan()

  // Priority 1: Active plan → plan banner + demoted content below
  if (activePlan && progress && currentDay) {
    const primaryPassage = currentDay.passages[0]
    const passageRef = primaryPassage
      ? formatPassageRef(primaryPassage.book, primaryPassage.chapter, primaryPassage.startVerse, primaryPassage.endVerse)
      : ''

    return (
      <div className="space-y-6">
        <ActivePlanBanner
          planSlug={activePlan.slug}
          planTitle={activePlan.title}
          currentDay={progress.currentDay}
          totalDays={activePlan.duration}
          dayTitle={currentDay.title}
          primaryPassage={passageRef}
        />
        {isActiveReader && book && chapter && slug && (
          <ResumeReadingCard
            book={book}
            chapter={chapter}
            slug={slug}
            relativeTime={relativeTime}
            firstLine={firstLineOfChapter}
            nextChapter={nextChapter}
          />
        )}
        <VerseOfTheDay variant="default" />
      </div>
    )
  }

  // Priority 2: Active reader: resume card primary, VOTD secondary
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
        <VerseOfTheDay variant="default" />
      </div>
    )
  }

  // Priority 3: Lapsed reader: VOTD primary, resume link secondary
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

  // Priority 4: First-time reader: VOTD only
  return <VerseOfTheDay />
}

function formatPassageRef(
  book: string,
  chapter: number,
  startVerse?: number,
  endVerse?: number,
): string {
  const bookData = getBookBySlug(book)
  const bookName = bookData?.name ?? book.charAt(0).toUpperCase() + book.slice(1)
  let ref = `${bookName} ${chapter}`
  if (startVerse) {
    ref += `:${startVerse}`
    if (endVerse && endVerse !== startVerse) {
      ref += `-${endVerse}`
    }
  }
  return ref
}
