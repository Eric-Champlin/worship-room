import { Paintbrush, Bookmark, PenLine, Brain, BookOpenText } from 'lucide-react'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { formatReference } from '@/lib/dailyHub/verseContext'
import { timeAgo, formatFullDate } from '@/lib/time'
import { HighlightCard } from './HighlightCard'
import { BookmarkCard } from './BookmarkCard'
import { NoteCard } from './NoteCard'
import { MeditationCard } from './MeditationCard'
import { JournalCard } from './JournalCard'
import type { ActivityItem } from '@/types/my-bible'

const TYPE_ICONS = {
  highlight: Paintbrush,
  bookmark: Bookmark,
  note: PenLine,
  meditation: Brain,
  journal: BookOpenText,
} as const

interface ActivityCardProps {
  item: ActivityItem
  verseText: string | null
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  onPointerDown?: (e: React.PointerEvent) => void
  onPointerUp?: (e: React.PointerEvent) => void
  onPointerMove?: (e: React.PointerEvent) => void
  onPointerCancel?: (e: React.PointerEvent) => void
  searchQuery?: string
}

export function ActivityCard({
  item,
  verseText,
  onClick,
  onContextMenu,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onPointerCancel,
  searchQuery,
}: ActivityCardProps) {
  const Icon = TYPE_ICONS[item.type]
  const reference = formatReference(item.bookName, item.chapter, item.startVerse, item.endVerse)
  const mostRecentMs = Math.max(item.createdAt, item.updatedAt)
  const isoDate = new Date(mostRecentMs).toISOString()
  const relativeTime = timeAgo(isoDate)
  const absoluteTime = formatFullDate(isoDate)

  return (
    <FrostedCard
      as="article"
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="!p-4"
    >
      <div
        onContextMenu={onContextMenu}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onPointerCancel={onPointerCancel}
      >
        {/* Top row: icon + reference + badge + timestamp */}
        <div className="flex items-center gap-2">
          <Icon size={16} className="flex-shrink-0 text-white/50" />
          <span className="text-sm font-medium text-white">{reference}</span>
          {item.type === 'meditation' && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
              Meditate
            </span>
          )}
          {item.type === 'journal' && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
              Journal
            </span>
          )}
          <time
            className="ml-auto flex-shrink-0 text-xs text-white/50"
            title={absoluteTime}
            dateTime={isoDate}
          >
            {relativeTime}
          </time>
        </div>

        {/* Type-specific content */}
        {item.data.type === 'highlight' && (
          <HighlightCard data={item.data} verseText={verseText} searchQuery={searchQuery} />
        )}
        {item.data.type === 'bookmark' && (
          <BookmarkCard data={item.data} verseText={verseText} searchQuery={searchQuery} />
        )}
        {item.data.type === 'note' && (
          <NoteCard
            data={item.data}
            verseText={verseText}
            createdAt={item.createdAt}
            updatedAt={item.updatedAt}
            searchQuery={searchQuery}
          />
        )}
        {item.data.type === 'meditation' && (
          <MeditationCard data={item.data} verseText={verseText} searchQuery={searchQuery} />
        )}
        {item.data.type === 'journal' && (
          <JournalCard data={item.data} verseText={verseText} searchQuery={searchQuery} />
        )}
      </div>
    </FrostedCard>
  )
}
