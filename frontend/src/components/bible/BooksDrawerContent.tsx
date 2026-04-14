import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { X, Search } from 'lucide-react'
import {
  BOOK_METADATA,
  OT_CATEGORIES,
  NT_CATEGORIES,
  DRAWER_CATEGORY_LABELS,
  formatReadingTime,
  getReadingTimeMinutes,
} from '@/constants/bookMetadata'
import { BIBLE_PROGRESS_KEY } from '@/constants/bible'
import { useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import type { BibleCategory } from '@/types/bible'
import type { BibleProgressMap } from '@/types/bible'
import type { BookMetadata } from '@/constants/bookMetadata'

type Testament = 'OT' | 'NT'

const TAB_STORAGE_KEY = 'wr_bible_books_tab'

interface BooksDrawerContentProps {
  onClose: () => void
}

export function BooksDrawerContent({ onClose }: BooksDrawerContentProps) {
  const { pushView, returnFocusSlugRef } = useBibleDrawer()
  const [searchQuery, setSearchQuery] = useState('')
  const [testament, setTestament] = useState<Testament>(() => {
    const stored = localStorage.getItem(TAB_STORAGE_KEY)
    return stored === 'NT' ? 'NT' : 'OT'
  })
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus management on mount: restore focus to previously-tapped book card (on pop),
  // or auto-focus search input (on initial open)
  useEffect(() => {
    const timer = setTimeout(() => {
      const returnSlug = returnFocusSlugRef.current
      if (returnSlug) {
        returnFocusSlugRef.current = null
        const el = document.querySelector(
          `[data-book-slug="${returnSlug}"]`,
        ) as HTMLElement | null
        if (el) {
          el.focus()
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
          return
        }
      }
      searchInputRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [returnFocusSlugRef])

  // '/' key focuses search input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Persist tab selection
  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, testament)
  }, [testament])

  // Read progress from localStorage
  const progress = useMemo<BibleProgressMap>(() => {
    try {
      const raw = localStorage.getItem(BIBLE_PROGRESS_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }, [])

  const categories = testament === 'OT' ? OT_CATEGORIES : NT_CATEGORIES
  const booksByCategory = useMemo(() => {
    const map = new Map<BibleCategory, BookMetadata[]>()
    for (const cat of categories) {
      map.set(
        cat,
        BOOK_METADATA.filter((b) => b.testament === testament && b.category === cat)
      )
    }
    return map
  }, [testament, categories])

  // Search logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.trim().toLowerCase()

    const exact: BookMetadata[] = []
    const prefix: BookMetadata[] = []
    const abbrev: BookMetadata[] = []
    const substring: BookMetadata[] = []

    for (const book of BOOK_METADATA) {
      const nameLower = book.name.toLowerCase()
      if (nameLower === q) {
        exact.push(book)
      } else if (nameLower.startsWith(q)) {
        prefix.push(book)
      } else if (book.abbreviations.some((a) => a === q || a.startsWith(q))) {
        abbrev.push(book)
      } else if (nameLower.includes(q)) {
        substring.push(book)
      }
    }

    return [...exact, ...prefix, ...abbrev, ...substring]
  }, [searchQuery])

  const handleSelectBook = useCallback(
    (slug: string) => {
      returnFocusSlugRef.current = slug
      pushView({ type: 'chapters', bookSlug: slug })
    },
    [pushView, returnFocusSlugRef],
  )

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && searchResults && searchResults.length > 0) {
        e.preventDefault()
        handleSelectBook(searchResults[0].slug)
      }
    },
    [searchResults, handleSelectBook]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Sticky Header */}
      <div
        className="sticky top-0 z-10 shrink-0 px-4 pt-4 pb-3"
        style={{ background: 'rgba(15, 10, 30, 0.98)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Books of the Bible</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close books drawer"
            className="flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="relative mt-3">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
          />
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Find a book"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full min-h-[44px] rounded-xl border border-white/[0.12] bg-white/[0.06] py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/50 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        {/* Testament tabs — hidden when search is active */}
        {!searchQuery && (
          <div
            className="mt-3 flex rounded-full border border-white/10 bg-white/[0.06] p-1"
            role="tablist"
            aria-label="Testament"
          >
            <TabButton
              label="Old Testament"
              isActive={testament === 'OT'}
              onClick={() => setTestament('OT')}
            />
            <TabButton
              label="New Testament"
              isActive={testament === 'NT'}
              onClick={() => setTestament('NT')}
            />
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {searchResults !== null ? (
          <SearchResultsView
            results={searchResults}
            progress={progress}
            onSelect={handleSelectBook}
          />
        ) : (
          <CategorizedBooksView
            categories={categories}
            booksByCategory={booksByCategory}
            progress={progress}
            onSelect={handleSelectBook}
          />
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/[0.08] px-4 py-3">
        <p className="text-center text-sm text-white/50">66 books · World English Bible</p>
      </div>
    </div>
  )
}

/** Expose search input ref for focus management (Step 6) */
BooksDrawerContent.displayName = 'BooksDrawerContent'

// --- Sub-components ---

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`flex-1 min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.20)]'
          : 'text-white/50 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

function CategorizedBooksView({
  categories,
  booksByCategory,
  progress,
  onSelect,
}: {
  categories: BibleCategory[]
  booksByCategory: Map<BibleCategory, BookMetadata[]>
  progress: BibleProgressMap
  onSelect: (slug: string) => void
}) {
  return (
    <>
      {categories.map((cat, i) => {
        const books = booksByCategory.get(cat) ?? []
        return (
          <div key={cat}>
            <h3
              className={`pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-white/50 ${
                i > 0 ? 'mt-2 border-t border-white/[0.08]' : ''
              }`}
            >
              {DRAWER_CATEGORY_LABELS[cat]}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {books.map((book) => (
                <BookCard key={book.slug} book={book} progress={progress} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

function SearchResultsView({
  results,
  progress,
  onSelect,
}: {
  results: BookMetadata[]
  progress: BibleProgressMap
  onSelect: (slug: string) => void
}) {
  return (
    <div className="pt-4">
      <p className="sr-only" aria-live="polite">
        {results.length} {results.length === 1 ? 'book' : 'books'} found
      </p>
      {results.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/50">No books found</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results.map((book) => (
            <BookCard key={book.slug} book={book} progress={progress} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookCard({
  book,
  progress,
  onSelect,
}: {
  book: BookMetadata
  progress: BibleProgressMap
  onSelect: (slug: string) => void
}) {
  const chaptersRead = progress[book.slug]?.length ?? 0
  const readingMinutes = getReadingTimeMinutes(book.wordCount)
  const progressPct = book.chapterCount > 0 ? (chaptersRead / book.chapterCount) * 100 : 0

  return (
    <button
      type="button"
      data-book-slug={book.slug}
      onClick={() => onSelect(book.slug)}
      className="relative min-h-[44px] w-full overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4 text-left backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-all motion-reduce:transition-none duration-base hover:-translate-y-0.5 hover:border-white/[0.18] hover:bg-white/[0.09] hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)] motion-reduce:hover:translate-y-0 active:scale-[0.98]"
    >
      <span className="block text-base font-semibold text-white">{book.name}</span>
      <span className="block text-sm text-white/60">
        {book.chapterCount} {book.chapterCount === 1 ? 'chapter' : 'chapters'}
      </span>
      <span className="block text-sm text-white/60">{formatReadingTime(readingMinutes)}</span>

      {/* Progress bar — only when > 0 */}
      {progressPct > 0 && (
        <div className="absolute right-0 bottom-0 left-0 h-0.5 overflow-hidden rounded-b-2xl bg-white/[0.06]">
          <div
            className="h-full bg-primary/60 transition-all motion-reduce:transition-none duration-base"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
      )}
    </button>
  )
}
