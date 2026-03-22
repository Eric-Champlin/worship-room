import { useSearchParams } from 'react-router-dom'

import { getBooksByTestament } from '@/data/bible'

import { TestamentAccordion } from './TestamentAccordion'

export function BibleBooksMode() {
  const [searchParams] = useSearchParams()
  const autoExpandSlug = searchParams.get('book')

  const otBooks = getBooksByTestament('old')
  const ntBooks = getBooksByTestament('new')

  return (
    <div className="mt-6 flex flex-col gap-4">
      <TestamentAccordion
        testament="old"
        books={otBooks}
        defaultExpanded
        autoExpandSlug={autoExpandSlug}
      />
      <TestamentAccordion
        testament="new"
        books={ntBooks}
        autoExpandSlug={autoExpandSlug}
      />
    </div>
  )
}
