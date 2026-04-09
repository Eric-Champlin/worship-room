import { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BIBLE_BOOKS } from '@/constants/bible'
import { BookFilterSheet } from './BookFilterSheet'
import type { ActivityFilter, ActivitySort } from '@/types/my-bible'

interface ActivityFilterBarProps {
  filter: ActivityFilter
  sort: ActivitySort
  onFilterChange: (filter: ActivityFilter) => void
  onSortChange: (sort: ActivitySort) => void
  bookCounts: Map<string, number>
}

const TYPE_OPTIONS = [
  { key: 'all' as const, label: 'All' },
  { key: 'highlights' as const, label: 'Highlights' },
  { key: 'notes' as const, label: 'Notes' },
  { key: 'bookmarks' as const, label: 'Bookmarks' },
  { key: 'daily-hub' as const, label: 'From Daily Hub' },
]

export function ActivityFilterBar({
  filter,
  sort,
  onFilterChange,
  onSortChange,
  bookCounts,
}: ActivityFilterBarProps) {
  const isMobile = useIsMobile()
  const [bookDropdownOpen, setBookDropdownOpen] = useState(false)
  const [bookSheetOpen, setBookSheetOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    if (!bookDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBookDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [bookDropdownOpen])

  const handleTypeChange = useCallback(
    (type: ActivityFilter['type']) => {
      onFilterChange({
        ...filter,
        type,
        color: type !== 'highlights' ? 'all' : filter.color,
      })
    },
    [filter, onFilterChange],
  )

  const handleBookSelect = useCallback(
    (book: string) => {
      onFilterChange({ ...filter, book })
    },
    [filter, onFilterChange],
  )

  const activeBookName =
    filter.book === 'all'
      ? 'All books'
      : BIBLE_BOOKS.find((b) => b.slug === filter.book)?.name ?? filter.book

  const booksWithItems = BIBLE_BOOKS.filter((b) => (bookCounts.get(b.slug) ?? 0) > 0)

  return (
    <div className="sticky top-16 z-30 border-b border-white/[0.08] bg-dashboard-dark/95 py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        {/* Type filter pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleTypeChange(option.key)}
              className={cn(
                'flex-shrink-0 rounded-full px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                filter.type === option.key
                  ? 'bg-primary font-medium text-white shadow-[0_0_12px_rgba(109,40,217,0.3)]'
                  : 'text-white/60 hover:bg-white/[0.06] hover:text-white/80',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Right side: sort + book filter */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Sort toggle */}
          <div className="flex rounded-lg border border-white/[0.12] text-xs">
            <button
              type="button"
              onClick={() => onSortChange('recent')}
              className={cn(
                'min-h-[44px] rounded-l-lg px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50',
                sort === 'recent' ? 'bg-white/[0.12] text-white' : 'text-white/50',
              )}
            >
              Recent
            </button>
            <button
              type="button"
              onClick={() => onSortChange('canonical')}
              className={cn(
                'min-h-[44px] rounded-r-lg px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50',
                sort === 'canonical' ? 'bg-white/[0.12] text-white' : 'text-white/50',
              )}
            >
              Bible order
            </button>
          </div>

          {/* Book filter */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (isMobile) {
                  setBookSheetOpen(true)
                } else {
                  setBookDropdownOpen((prev) => !prev)
                }
              }}
              className="flex min-h-[44px] items-center gap-1 rounded-lg border border-white/[0.12] px-2.5 py-1 text-xs text-white/70 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <span className="max-w-[80px] truncate">{activeBookName}</span>
              <ChevronDown size={12} />
            </button>

            {/* Desktop dropdown */}
            {bookDropdownOpen && !isMobile && (
              <div className="absolute right-0 top-full z-50 mt-1 max-h-[300px] w-48 overflow-y-auto rounded-xl border border-white/[0.12] bg-[rgba(15,10,30,0.95)] py-1 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-[16px]">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/[0.08] focus-visible:outline-none focus-visible:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50"
                  onClick={() => {
                    handleBookSelect('all')
                    setBookDropdownOpen(false)
                  }}
                >
                  All books
                </button>
                {booksWithItems.map((book) => (
                  <button
                    key={book.slug}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-white hover:bg-white/[0.08] focus-visible:outline-none focus-visible:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50"
                    onClick={() => {
                      handleBookSelect(book.slug)
                      setBookDropdownOpen(false)
                    }}
                  >
                    <span>{book.name}</span>
                    <span className="text-xs text-white/50">{bookCounts.get(book.slug)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile book sheet */}
      {bookSheetOpen && isMobile && (
        <BookFilterSheet
          activeBook={filter.book}
          bookCounts={bookCounts}
          onSelect={handleBookSelect}
          onClose={() => setBookSheetOpen(false)}
        />
      )}
    </div>
  )
}
