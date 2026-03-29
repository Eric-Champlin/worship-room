import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { BIBLE_CATEGORIES } from '@/constants/bible'
import { getBooksByCategory } from '@/data/bible'
import { cn } from '@/lib/utils'
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance'
import type { BibleBook } from '@/types/bible'

import { CategoryGroup } from './CategoryGroup'

interface TestamentAccordionProps {
  testament: 'old' | 'new'
  books: BibleBook[]
  defaultExpanded?: boolean
  autoExpandSlug?: string | null
}

export function TestamentAccordion({
  testament,
  books,
  defaultExpanded = false,
  autoExpandSlug,
}: TestamentAccordionProps) {
  const hasAutoExpand = autoExpandSlug
    ? books.some((b) => b.slug === autoExpandSlug)
    : false

  const [isExpanded, setIsExpanded] = useState(defaultExpanded || hasAutoExpand)

  const label = testament === 'old' ? 'Old Testament' : 'New Testament'
  const categories = BIBLE_CATEGORIES.filter((c) => c.testament === testament)
  const { containerRef: categoryListRef, getStaggerProps: getCategoryStaggerProps } =
    useStaggeredEntrance({ staggerDelay: 30, itemCount: categories.length, inView: isExpanded })

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex w-full min-h-[44px] items-center justify-between px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">{label}</h3>
          <span className="text-sm text-white/40">{books.length} books</span>
        </div>
        <ChevronDown
          size={20}
          className={cn(
            'text-white/40 transition-transform',
            isExpanded && 'rotate-180',
          )}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-white/10 pb-2" ref={categoryListRef}>
          {categories.map((cat, index) => {
            const categoryBooks = getBooksByCategory(cat.key)
            if (categoryBooks.length === 0) return null
            const stagger = getCategoryStaggerProps(index)
            return (
              <div key={cat.key} className={stagger.className} style={stagger.style}>
                <CategoryGroup
                  category={cat.key}
                  books={categoryBooks}
                  autoExpandSlug={autoExpandSlug}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
