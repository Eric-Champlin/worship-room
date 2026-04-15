import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ReaderBody } from '../ReaderBody'
import type { ReaderSettings } from '@/hooks/useReaderSettings'
import type { BibleVerse, Bookmark, Highlight, Note } from '@/types/bible'

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'midnight',
  typeSize: 'm',
  lineHeight: 'normal',
  fontFamily: 'serif',
}

const MOCK_VERSES: BibleVerse[] = [
  { number: 1, text: 'In the beginning was the Word.' },
  { number: 2, text: 'The same was in the beginning with God.' },
  { number: 3, text: 'All things were made through him.' },
  { number: 4, text: 'In him was life.' },
  { number: 5, text: 'The light shines in the darkness.' },
]

describe('ReaderBody', () => {
  it('renders all verses with correct data attributes', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
      />,
    )

    const verseSpans = document.querySelectorAll('span[data-verse]')
    expect(verseSpans).toHaveLength(5)

    const first = verseSpans[0]
    expect(first.getAttribute('data-verse')).toBe('1')
    expect(first.getAttribute('data-book')).toBe('john')
    expect(first.getAttribute('data-chapter')).toBe('1')
    expect(first.id).toBe('verse-1')
  })

  it('skips blank verses', () => {
    const versesWithBlank: BibleVerse[] = [
      { number: 1, text: 'Valid text.' },
      { number: 2, text: '' },
      { number: 3, text: '   ' },
      { number: 4, text: 'Also valid.' },
    ]

    render(
      <ReaderBody
        verses={versesWithBlank}
        bookSlug="luke"
        chapter={17}
        settings={DEFAULT_SETTINGS}
      />,
    )

    const verseSpans = document.querySelectorAll('span[data-verse]')
    expect(verseSpans).toHaveLength(2)
    expect(verseSpans[0].getAttribute('data-verse')).toBe('1')
    expect(verseSpans[1].getAttribute('data-verse')).toBe('4')
  })

  it('inserts paragraph breaks when paragraphs array has entries', () => {
    const { container } = render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        paragraphs={[3, 5]}
      />,
    )

    const brs = container.querySelectorAll('br')
    // 2 paragraph breaks × 2 <br> each = 4
    expect(brs).toHaveLength(4)
  })

  it('no paragraph breaks when paragraphs is empty', () => {
    const { container } = render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        paragraphs={[]}
      />,
    )

    const brs = container.querySelectorAll('br')
    expect(brs).toHaveLength(0)
  })

  it('verse spans have no click handler or role', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
      />,
    )

    const verseSpans = document.querySelectorAll('span[data-verse]')
    for (const span of verseSpans) {
      expect(span.getAttribute('role')).toBeNull()
      expect(span.getAttribute('tabindex')).toBeNull()
    }
  })

  it('applies size/line-height/font classes from settings', () => {
    const { container } = render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={{ ...DEFAULT_SETTINGS, typeSize: 'xl', lineHeight: 'relaxed', fontFamily: 'sans' }}
      />,
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('text-2xl')
    expect(wrapper.className).toContain('leading-loose')
    expect(wrapper.className).toContain('font-sans')
  })

  it('renders verse number superscripts', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
      />,
    )

    const sups = document.querySelectorAll('sup')
    expect(sups).toHaveLength(5)
    expect(sups[0].textContent).toBe('1')
  })

  it('renders sentinel for long chapters (>40 verses)', () => {
    const longVerses: BibleVerse[] = Array.from({ length: 45 }, (_, i) => ({
      number: i + 1,
      text: `Verse ${i + 1} text.`,
    }))

    render(
      <ReaderBody
        verses={longVerses}
        bookSlug="psalms"
        chapter={119}
        settings={DEFAULT_SETTINGS}
      />,
    )

    expect(document.getElementById('verse-jump-sentinel')).toBeTruthy()
  })

  it('does not render sentinel for short chapters (≤40 verses)', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
      />,
    )

    expect(document.getElementById('verse-jump-sentinel')).toBeFalsy()
  })

  // --- Selection highlight tests (BB-6) ---

  it('no selection class without selectedVerses prop', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
      />,
    )

    const verseSpans = document.querySelectorAll('span[data-verse]')
    for (const span of verseSpans) {
      expect(span.className).not.toContain('bg-primary')
      expect(span.className).not.toContain('outline')
    }
  })

  it('selection class applied to selected verse', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        selectedVerses={[1]}
        selectionVisible={true}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]')!
    expect(verse1.className).toContain('bg-primary/[0.15]')
    expect(verse1.className).toContain('rounded-sm')
  })

  it('outline ring on highlighted + selected verse', () => {
    const highlights: Highlight[] = [{
      id: 'test-1',
      book: 'john',
      chapter: 1,
      startVerse: 1,
      endVerse: 1,
      color: 'peace',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }]
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        selectedVerses={[1]}
        chapterHighlights={highlights}
        selectionVisible={true}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]')!
    expect(verse1.className).toContain('outline')
    expect(verse1.className).not.toContain('bg-primary/[0.15]')
  })

  it('multiple verses selected', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        selectedVerses={[1, 2, 3]}
        selectionVisible={true}
      />,
    )

    for (const num of [1, 2, 3]) {
      const span = document.querySelector(`[data-verse="${num}"]`)!
      expect(span.className).toContain('bg-primary/[0.15]')
    }
    // Verse 4 should NOT be selected
    const verse4 = document.querySelector('[data-verse="4"]')!
    expect(verse4.className).not.toContain('bg-primary')
  })

  it('transition class when fading', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        selectedVerses={[1]}
        selectionVisible={false}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]')!
    expect(verse1.className).toContain('transition-colors')
    expect(verse1.className).toContain('duration-base')
    expect(verse1.className).not.toContain('bg-primary/[0.15]')
  })

  // --- BB-7 Highlight rendering tests ---

  const makeHighlight = (overrides: Partial<Highlight> = {}): Highlight => ({
    id: 'hl-1',
    book: 'john',
    chapter: 1,
    startVerse: 1,
    endVerse: 1,
    color: 'peace',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  })

  it('verse with highlight shows background color style', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterHighlights={[makeHighlight()]}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]') as HTMLElement
    expect(verse1.style.backgroundColor).toBe('var(--highlight-peace-bg)')
  })

  it('verse without highlight has no background', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterHighlights={[makeHighlight()]}
      />,
    )

    const verse2 = document.querySelector('[data-verse="2"]') as HTMLElement
    expect(verse2.style.backgroundColor).toBe('')
  })

  it('highlighted + selected verse ring uses highlight color', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        selectedVerses={[1]}
        chapterHighlights={[makeHighlight({ color: 'joy' })]}
        selectionVisible={true}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]') as HTMLElement
    expect(verse1.style.outlineColor).toBe('var(--highlight-joy-ring)')
  })

  it('selected + not highlighted verse shows default purple bg', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        selectedVerses={[2]}
        chapterHighlights={[makeHighlight()]}
        selectionVisible={true}
      />,
    )

    const verse2 = document.querySelector('[data-verse="2"]')!
    expect(verse2.className).toContain('bg-primary/[0.15]')
  })

  it('box-decoration-break clone applied to highlighted verse', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterHighlights={[makeHighlight()]}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]') as HTMLElement
    expect(verse1.style.boxDecorationBreak).toBe('clone')
  })

  it('fresh highlight verse gets pulse class', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterHighlights={[makeHighlight()]}
        freshHighlightVerses={[1]}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]')!
    expect(verse1.className).toContain('animate-highlight-pulse')
  })

  it('pulse class absent when reduced motion', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterHighlights={[makeHighlight()]}
        freshHighlightVerses={[1]}
        reducedMotion={true}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]')!
    expect(verse1.className).not.toContain('animate-highlight-pulse')
  })

  // --- BB-7.5 Bookmark rendering tests ---

  const makeBookmark = (overrides: Partial<Bookmark> = {}): Bookmark => ({
    id: 'bm-1',
    book: 'john',
    chapter: 1,
    startVerse: 1,
    endVerse: 1,
    createdAt: Date.now(),
    ...overrides,
  })

  it('renders bookmark marker for bookmarked verse', () => {
    const { container } = render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterBookmarks={[makeBookmark()]}
      />,
    )

    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(1)
    // The bookmark marker SVG should be inside verse 1
    const verse1 = document.querySelector('[data-verse="1"]')!
    expect(verse1.querySelector('svg')).toBeTruthy()
  })

  it('does not render marker for non-bookmarked verse', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterBookmarks={[makeBookmark()]}
      />,
    )

    const verse2 = document.querySelector('[data-verse="2"]')!
    expect(verse2.querySelector('svg')).toBeFalsy()
  })

  it('adds aria-label for bookmarked verse', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterBookmarks={[makeBookmark()]}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]')!
    expect(verse1.getAttribute('aria-label')).toContain('bookmarked')
  })

  it('bookmark marker coexists with highlight background', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterHighlights={[makeHighlight()]}
        chapterBookmarks={[makeBookmark()]}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]') as HTMLElement
    // Has highlight background
    expect(verse1.style.backgroundColor).toBe('var(--highlight-peace-bg)')
    // Has bookmark marker
    expect(verse1.querySelector('svg')).toBeTruthy()
  })

  // --- Note marker tests (BB-8) ---

  it('renders note marker when verse has a note', () => {
    const notes: Note[] = [
      {
        id: 'n1',
        book: 'john',
        chapter: 1,
        startVerse: 1,
        endVerse: 1,
        body: 'Test note',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterNotes={notes}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]') as HTMLElement
    expect(verse1.querySelector('.note-marker')).toBeTruthy()
  })

  it('does not render note marker when verse has no note', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterNotes={[]}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]') as HTMLElement
    expect(verse1.querySelector('.note-marker')).toBeFalsy()
  })

  it('aria-label includes "has a note" for noted verses', () => {
    const notes: Note[] = [
      {
        id: 'n1',
        book: 'john',
        chapter: 1,
        startVerse: 2,
        endVerse: 2,
        body: 'My note',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterNotes={notes}
      />,
    )

    const verse2 = document.querySelector('[data-verse="2"]') as HTMLElement
    expect(verse2.getAttribute('aria-label')).toBe('john 1:2, has a note')
  })

  it('aria-label includes "bookmarked, has a note" when both present', () => {
    const bookmarks: Bookmark[] = [
      { id: 'b1', book: 'john', chapter: 1, startVerse: 1, endVerse: 1, createdAt: Date.now() },
    ]
    const notes: Note[] = [
      {
        id: 'n1',
        book: 'john',
        chapter: 1,
        startVerse: 1,
        endVerse: 1,
        body: 'Note',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterBookmarks={bookmarks}
        chapterNotes={notes}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]') as HTMLElement
    expect(verse1.getAttribute('aria-label')).toBe('john 1:1, bookmarked, has a note')
  })

  it('note marker and bookmark marker coexist on same verse', () => {
    const bookmarks: Bookmark[] = [
      { id: 'b1', book: 'john', chapter: 1, startVerse: 1, endVerse: 1, createdAt: Date.now() },
    ]
    const notes: Note[] = [
      {
        id: 'n1',
        book: 'john',
        chapter: 1,
        startVerse: 1,
        endVerse: 1,
        body: 'Both',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterBookmarks={bookmarks}
        chapterNotes={notes}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]') as HTMLElement
    expect(verse1.querySelector('.bookmark-marker')).toBeTruthy()
    expect(verse1.querySelector('.note-marker')).toBeTruthy()
  })
})

describe('ReaderBody (BB-44 — read-along highlighting)', () => {
  it('when readAlongVerse is null, no verse has aria-current', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        readAlongVerse={null}
      />,
    )
    const withAriaCurrent = document.querySelectorAll('[aria-current]')
    expect(withAriaCurrent).toHaveLength(0)
  })

  it('when readAlongVerse is 5, verse 5 has aria-current="true" and others do not', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        readAlongVerse={5}
      />,
    )
    const verse5 = document.querySelector('[data-verse="5"]') as HTMLElement
    expect(verse5.getAttribute('aria-current')).toBe('true')

    const verse1 = document.querySelector('[data-verse="1"]') as HTMLElement
    expect(verse1.getAttribute('aria-current')).toBeNull()
  })

  it('verse with readAlongVerse has the read-along background tint style', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        readAlongVerse={3}
      />,
    )
    const verse3 = document.querySelector('[data-verse="3"]') as HTMLElement
    expect(verse3.style.backgroundColor).toBe('rgba(255, 255, 255, 0.04)')
  })

  it('verse with readAlongVerse has the left accent bar box-shadow', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        readAlongVerse={3}
      />,
    )
    const verse3 = document.querySelector('[data-verse="3"]') as HTMLElement
    expect(verse3.style.boxShadow).toContain('inset 3px 0 0 0 rgba(109, 40, 217, 0.6)')
  })

  it('read-along highlight coexists with user highlight — user color preserved, accent bar added', () => {
    const highlights: Highlight[] = [
      {
        id: 'h1',
        book: 'john',
        chapter: 1,
        startVerse: 3,
        endVerse: 3,
        color: 'yellow',
        createdAt: Date.now(),
      },
    ]
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        chapterHighlights={highlights}
        readAlongVerse={3}
      />,
    )
    const verse3 = document.querySelector('[data-verse="3"]') as HTMLElement
    // User highlight backgroundColor is preserved (NOT overridden by read-along tint)
    expect(verse3.style.backgroundColor).toBe('var(--highlight-yellow-bg)')
    // Read-along adds the left accent bar via boxShadow
    expect(verse3.style.boxShadow).toContain('inset 3px 0 0 0 rgba(109, 40, 217, 0.6)')
    expect(verse3.getAttribute('aria-current')).toBe('true')
  })

  it('read-along highlight coexists with selection styling', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        selectedVerses={[3]}
        selectionVisible={true}
        readAlongVerse={3}
      />,
    )
    const verse3 = document.querySelector('[data-verse="3"]') as HTMLElement
    expect(verse3.getAttribute('aria-current')).toBe('true')
    expect(verse3.style.backgroundColor).toBe('rgba(255, 255, 255, 0.04)')
  })

  it('changing readAlongVerse prop from 5 to 3 moves aria-current', () => {
    const { rerender } = render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        readAlongVerse={5}
      />,
    )
    expect(document.querySelector('[data-verse="5"]')?.getAttribute('aria-current')).toBe('true')
    expect(document.querySelector('[data-verse="3"]')?.getAttribute('aria-current')).toBeNull()

    rerender(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        readAlongVerse={3}
      />,
    )
    expect(document.querySelector('[data-verse="3"]')?.getAttribute('aria-current')).toBe('true')
    expect(document.querySelector('[data-verse="5"]')?.getAttribute('aria-current')).toBeNull()
  })
})
