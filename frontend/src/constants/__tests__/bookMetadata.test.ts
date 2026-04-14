import { describe, it, expect } from 'vitest'
import {
  BOOK_METADATA,
  OT_CATEGORIES,
  NT_CATEGORIES,
  DRAWER_CATEGORY_LABELS,
  formatReadingTime,
} from '../bookMetadata'

describe('bookMetadata', () => {
  it('exports 66 book entries', () => {
    expect(BOOK_METADATA).toHaveLength(66)
  })

  it('OT has 39 books, NT has 27', () => {
    const ot = BOOK_METADATA.filter((b) => b.testament === 'OT')
    const nt = BOOK_METADATA.filter((b) => b.testament === 'NT')
    expect(ot).toHaveLength(39)
    expect(nt).toHaveLength(27)
  })

  it('every book has wordCount > 0', () => {
    for (const book of BOOK_METADATA) {
      expect(book.wordCount, `${book.name} has no word count`).toBeGreaterThan(0)
    }
  })

  it('every book has at least 1 abbreviation', () => {
    for (const book of BOOK_METADATA) {
      expect(book.abbreviations.length, `${book.name} has no abbreviations`).toBeGreaterThanOrEqual(
        1
      )
    }
  })

  it('categories match spec groupings', () => {
    const otBooks = BOOK_METADATA.filter((b) => b.testament === 'OT')
    const ntBooks = BOOK_METADATA.filter((b) => b.testament === 'NT')

    // OT: 5 pentateuch + 12 historical + 5 wisdom-poetry + 5 major-prophets + 12 minor-prophets = 39
    expect(otBooks.filter((b) => b.category === 'pentateuch')).toHaveLength(5)
    expect(otBooks.filter((b) => b.category === 'historical')).toHaveLength(12)
    expect(otBooks.filter((b) => b.category === 'wisdom-poetry')).toHaveLength(5)
    expect(otBooks.filter((b) => b.category === 'major-prophets')).toHaveLength(5)
    expect(otBooks.filter((b) => b.category === 'minor-prophets')).toHaveLength(12)

    // NT: 4 gospels + 1 history + 13 pauline-epistles + 8 general-epistles + 1 prophecy = 27
    expect(ntBooks.filter((b) => b.category === 'gospels')).toHaveLength(4)
    expect(ntBooks.filter((b) => b.category === 'history')).toHaveLength(1)
    expect(ntBooks.filter((b) => b.category === 'pauline-epistles')).toHaveLength(13)
    expect(ntBooks.filter((b) => b.category === 'general-epistles')).toHaveLength(8)
    expect(ntBooks.filter((b) => b.category === 'prophecy')).toHaveLength(1)

    expect(OT_CATEGORIES).toHaveLength(5)
    expect(NT_CATEGORIES).toHaveLength(5)
  })

  it('formatReadingTime handles hours and minutes', () => {
    expect(formatReadingTime(0)).toBe('~0 min')
    expect(formatReadingTime(30)).toBe('~30 min')
    expect(formatReadingTime(59)).toBe('~59 min')
    expect(formatReadingTime(60)).toBe('~1 hr')
    expect(formatReadingTime(90)).toBe('~1 hr 30 min')
    expect(formatReadingTime(200)).toBe('~3 hr 20 min')
  })

  it('drawerCategoryLabel maps correctly', () => {
    expect(DRAWER_CATEGORY_LABELS.pentateuch).toBe('Law')
    expect(DRAWER_CATEGORY_LABELS.prophecy).toBe('Apocalyptic')
    expect(DRAWER_CATEGORY_LABELS.history).toBe('History')
    expect(DRAWER_CATEGORY_LABELS.gospels).toBe('Gospels')

    const genesis = BOOK_METADATA.find((b) => b.slug === 'genesis')!
    expect(genesis.drawerCategoryLabel).toBe('Law')

    const revelation = BOOK_METADATA.find((b) => b.slug === 'revelation')!
    expect(revelation.drawerCategoryLabel).toBe('Apocalyptic')
  })
})
