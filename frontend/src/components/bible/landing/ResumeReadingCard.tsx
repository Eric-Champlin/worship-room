import { BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { timeAgo } from '@/lib/time'
import { BIBLE_BOOKS } from '@/constants/bible'
import type { LastRead } from '@/types/bible-landing'

interface ResumeReadingCardProps {
  lastRead: LastRead | null
}

export function ResumeReadingCard({ lastRead }: ResumeReadingCardProps) {
  if (!lastRead) {
    return (
      <FrostedCard as="article">
        <Link to="/bible/browse" className="flex flex-col items-center gap-3 text-center">
          <BookOpen className="h-8 w-8 text-white/60" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-bold text-white">Start your first reading</h3>
            <p className="mt-1 text-sm text-white/60">Open the Bible and begin anywhere</p>
          </div>
        </Link>
      </FrostedCard>
    )
  }

  const book = BIBLE_BOOKS.find((b) => b.name === lastRead.book)
  const slug = book?.slug ?? lastRead.book.toLowerCase()
  const relativeTime = timeAgo(new Date(lastRead.timestamp).toISOString())

  return (
    <FrostedCard as="article">
      <Link to={`/bible/${slug}/${lastRead.chapter}`} className="block">
        <p className="text-sm text-white/60">Pick up where you left off</p>
        <h3 className="mt-1 text-xl font-bold text-white">
          {lastRead.book} {lastRead.chapter}
        </h3>
        <p className="mt-1 text-sm text-white/60">{relativeTime}</p>
      </Link>
    </FrostedCard>
  )
}
