import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { BookCoverage, ChapterState } from '@/types/heatmap'

export interface BibleProgressMapProps {
  coverage: BookCoverage[]
  totalChaptersRead: number
  booksVisited: number
}

export function BibleProgressMap({ coverage, totalChaptersRead, booksVisited }: BibleProgressMapProps) {
  const navigate = useNavigate()
  const otBooks = coverage.filter((b) => b.testament === 'old')
  const ntBooks = coverage.filter((b) => b.testament === 'new')
  const isEmpty = totalChaptersRead === 0 && booksVisited === 0

  return (
    <section aria-label="Bible progress map">
      {/* Summary */}
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-sm text-white">
          <strong>{totalChaptersRead.toLocaleString()}</strong> of 1,189 chapters read
          {' \u00B7 '}
          <strong>{booksVisited}</strong> of 66 books visited
        </p>
      </div>

      {isEmpty ? (
        <p className="text-sm text-white/60">Your reading map will show up here as you read.</p>
      ) : (
        <>
          {/* Old Testament */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
              Old Testament
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otBooks.map((book) => (
                <BookCard key={book.slug} book={book} onNavigate={navigate} />
              ))}
            </div>
          </div>

          {/* New Testament */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
              New Testament
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ntBooks.map((book) => (
                <BookCard key={book.slug} book={book} onNavigate={navigate} />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

// --- BookCard Sub-Component ---

function BookCard({
  book,
  onNavigate,
}: {
  book: BookCoverage
  onNavigate: (path: string) => void
}) {
  const readCount = book.readChapters.size

  function getChapterState(chapter: number): ChapterState {
    if (book.highlightedChapters.has(chapter)) return 'highlighted'
    if (book.readChapters.has(chapter)) return 'read'
    return 'unread'
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      {/* Book name */}
      <button
        type="button"
        onClick={() => onNavigate(`/bible/${book.slug}/1`)}
        className="text-sm font-medium text-white transition-colors hover:text-white/80"
      >
        {book.name}
      </button>
      <p className="mt-0.5 text-xs text-white/40">
        {readCount} / {book.totalChapters} chapters
      </p>

      {/* Chapter cell grid */}
      <div className="mt-2 flex flex-wrap gap-[2px]">
        {Array.from({ length: book.totalChapters }, (_, i) => i + 1).map((chapter) => {
          const state = getChapterState(chapter)
          return (
            <button
              key={chapter}
              type="button"
              onClick={() => onNavigate(`/bible/${book.slug}/${chapter}`)}
              className={cn(
                'h-1.5 w-1.5 rounded-[1px] transition-opacity motion-reduce:transition-none hover:opacity-80 sm:h-2 sm:w-2 lg:h-2.5 lg:w-2.5',
                state === 'unread' && 'bg-white/[0.06]',
                state === 'read' && 'bg-white/80',
                state === 'highlighted' && 'bg-white',
              )}
              aria-label={`${book.name} chapter ${chapter}: ${state}`}
              title={`${book.name} ${chapter}`}
            />
          )
        })}
      </div>
    </div>
  )
}
