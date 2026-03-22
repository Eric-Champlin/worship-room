import { useCallback, useState } from 'react'

import { CATEGORY_LABELS } from '@/constants/bible'
import type { BibleBook, BibleCategory } from '@/types/bible'

import { BookEntry } from './BookEntry'

interface CategoryGroupProps {
  category: BibleCategory
  books: BibleBook[]
  autoExpandSlug?: string | null
}

export function CategoryGroup({ category, books, autoExpandSlug }: CategoryGroupProps) {
  const initialExpanded = autoExpandSlug
    ? books.find((b) => b.slug === autoExpandSlug)?.slug ?? null
    : null

  const [expandedBook, setExpandedBook] = useState<string | null>(initialExpanded)

  const handleToggle = useCallback((slug: string) => {
    setExpandedBook((prev) => (prev === slug ? null : slug))
  }, [])

  return (
    <div className="mt-2">
      <h4 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/40">
        {CATEGORY_LABELS[category]} ({books.length})
      </h4>
      <div>
        {books.map((book) => (
          <BookEntry
            key={book.slug}
            book={book}
            isExpanded={expandedBook === book.slug}
            onToggle={() => handleToggle(book.slug)}
          />
        ))}
      </div>
    </div>
  )
}
