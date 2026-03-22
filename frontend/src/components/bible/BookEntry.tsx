import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useBibleProgress } from '@/hooks/useBibleProgress'
import type { BibleBook } from '@/types/bible'

import { ChapterGrid } from './ChapterGrid'

interface BookEntryProps {
  book: BibleBook
  isExpanded: boolean
  onToggle: () => void
}

export function BookEntry({ book, isExpanded, onToggle }: BookEntryProps) {
  const { isAuthenticated } = useAuth()
  const { getBookProgress } = useBibleProgress()

  const completedChapters = getBookProgress(book.slug)
  const hasProgress = isAuthenticated && completedChapters.length > 0

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full min-h-[44px] items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">{book.name}</span>
          {!book.hasFullText && (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/40">
              Coming soon
            </span>
          )}
          {hasProgress && (
            <span className="text-xs text-white/40">
              {completedChapters.length}/{book.chapters} read
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">
            {book.chapters} {book.chapters === 1 ? 'chapter' : 'chapters'}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              'text-white/40 transition-transform',
              isExpanded && 'rotate-180',
            )}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1">
          <ChapterGrid
            bookSlug={book.slug}
            totalChapters={book.chapters}
            hasFullText={book.hasFullText}
            completedChapters={completedChapters}
            isAuthenticated={isAuthenticated}
          />
        </div>
      )}
    </div>
  )
}
