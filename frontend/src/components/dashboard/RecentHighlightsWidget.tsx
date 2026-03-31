import { BookOpen, StickyNote } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getRecentBibleAnnotations, formatVerseReference } from '@/services/bible-annotations-storage'
import { timeAgo } from '@/lib/time'

export function RecentHighlightsWidget() {
  const items = getRecentBibleAnnotations(3)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <BookOpen className="mb-2 h-8 w-8 text-white/30" aria-hidden="true" />
        <p className="text-sm text-white/50">Start highlighting as you read</p>
        <Link
          to="/bible"
          className="mt-2 text-sm text-primary-lt transition-colors hover:text-primary"
        >
          Open Bible &gt;
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const ref = formatVerseReference(item.book, item.chapter, item.verseNumber)
        const link = `/bible/${item.book}/${item.chapter}#verse-${item.verseNumber}`
        return (
          <Link
            key={`${item.book}-${item.chapter}-${item.verseNumber}-${i}`}
            to={link}
            className="-mx-2 flex items-start gap-2 rounded-lg p-2 transition-colors hover:bg-white/5"
          >
            {item.type === 'highlight' ? (
              <span
                className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
            ) : (
              <StickyNote
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-white/40"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm text-white">
                {item.type === 'note' ? item.text : ref}
              </p>
              <div className="flex items-center gap-2">
                {item.type === 'note' && (
                  <span className="text-sm text-white/60">{ref}</span>
                )}
                <span className="text-xs text-white/60">{timeAgo(item.createdAt)}</span>
              </div>
            </div>
          </Link>
        )
      })}
      <Link
        to="/bible"
        className="block text-sm text-primary-lt transition-colors hover:text-primary"
      >
        See all &gt;
      </Link>
    </div>
  )
}
