import { Share2, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { getTodaysBibleVotd } from '@/lib/bible/votdSelector'
import { BIBLE_BOOKS } from '@/constants/bible'

export function VerseOfTheDay() {
  const entry = getTodaysBibleVotd()
  const book = BIBLE_BOOKS.find((b) => b.name === entry.book)
  const slug = book?.slug ?? entry.book.toLowerCase()

  return (
    <div className="mx-auto max-w-2xl">
      <FrostedCard as="article">
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium uppercase tracking-widest text-white/50">
            Verse of the Day
          </span>
          <button
            type="button"
            onClick={() => console.log('Share VOTD:', entry.reference)}
            aria-label="Share verse of the day"
            className="inline-flex items-center justify-center rounded-full p-2 text-white/50 hover:bg-white/[0.06] hover:text-white/70 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <blockquote className="mt-3 font-serif italic text-lg text-white/80 leading-relaxed">
          &ldquo;{entry.text}&rdquo;
        </blockquote>
        <p className="mt-3 text-sm font-semibold text-white/60">{entry.reference}</p>
        <Link
          to={`/bible/${slug}/${entry.chapter}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Read in context
        </Link>
      </FrostedCard>
    </div>
  )
}
