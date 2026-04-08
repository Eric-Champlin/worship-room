import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ReaderBody } from '../ReaderBody'
import type { ReaderSettings } from '@/hooks/useReaderSettings'
import type { BibleVerse } from '@/types/bible'

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

  it('outline ring on highlighted verse', () => {
    render(
      <ReaderBody
        verses={MOCK_VERSES}
        bookSlug="john"
        chapter={1}
        settings={DEFAULT_SETTINGS}
        selectedVerses={[1]}
        highlightedVerseNumbers={[1]}
        selectionVisible={true}
      />,
    )

    const verse1 = document.querySelector('[data-verse="1"]')!
    expect(verse1.className).toContain('outline')
    expect(verse1.className).toContain('outline-primary/40')
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
    expect(verse1.className).toContain('duration-200')
    expect(verse1.className).not.toContain('bg-primary/[0.15]')
  })
})
