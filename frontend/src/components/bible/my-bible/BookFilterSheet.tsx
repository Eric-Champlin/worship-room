import { BIBLE_BOOKS } from '@/constants/bible'

interface BookFilterSheetProps {
  activeBook: string
  bookCounts: Map<string, number>
  onSelect: (book: string) => void
  onClose: () => void
}

export function BookFilterSheet({ activeBook, bookCounts, onSelect, onClose }: BookFilterSheetProps) {
  const booksWithItems = BIBLE_BOOKS.filter((b) => (bookCounts.get(b.slug) ?? 0) > 0)

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="listbox"
        aria-label="Filter by book"
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t border-white/[0.12] bg-[rgba(15,10,30,0.95)] backdrop-blur-[16px]"
      >
        <div className="py-2">
          <button
            type="button"
            role="option"
            aria-selected={activeBook === 'all'}
            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/[0.08]"
            onClick={() => { onSelect('all'); onClose() }}
          >
            All books
          </button>
          {booksWithItems.map((book) => (
            <button
              key={book.slug}
              type="button"
              role="option"
              aria-selected={activeBook === book.slug}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white hover:bg-white/[0.08]"
              onClick={() => { onSelect(book.slug); onClose() }}
            >
              <span>{book.name}</span>
              <span className="text-xs text-white/50">{bookCounts.get(book.slug)}</span>
            </button>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </>
  )
}
