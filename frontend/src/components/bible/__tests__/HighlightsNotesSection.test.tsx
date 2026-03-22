import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { HighlightsNotesSection } from '../HighlightsNotesSection'
import type { BibleHighlight, BibleNote } from '@/types/bible'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/data/bible', async () => {
  const actual = await vi.importActual('@/data/bible')
  return {
    ...actual,
    loadChapter: vi.fn().mockImplementation((slug: string, chapter: number) => {
      if (slug === 'genesis' && chapter === 1) {
        return Promise.resolve({
          bookSlug: 'genesis',
          chapter: 1,
          verses: [
            { number: 1, text: 'In the beginning, God created the heavens and the earth.' },
            { number: 2, text: 'The earth was formless and empty.' },
          ],
        })
      }
      return Promise.resolve(null)
    }),
  }
})

const mockHighlights: BibleHighlight[] = [
  { book: 'genesis', chapter: 1, verseNumber: 1, color: '#FBBF24', createdAt: '2026-03-22T10:00:00.000Z' },
  { book: 'genesis', chapter: 1, verseNumber: 2, color: '#34D399', createdAt: '2026-03-22T09:00:00.000Z' },
]

const mockNotes: BibleNote[] = [
  {
    id: 'note-1',
    book: 'genesis',
    chapter: 1,
    verseNumber: 1,
    text: 'Beautiful beginning of creation.',
    createdAt: '2026-03-22T10:30:00.000Z',
    updatedAt: '2026-03-22T10:30:00.000Z',
  },
]

function renderSection(highlights = mockHighlights, notes = mockNotes) {
  return render(
    <MemoryRouter>
      <HighlightsNotesSection highlights={highlights} notes={notes} />
    </MemoryRouter>,
  )
}

describe('HighlightsNotesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when no data', () => {
    const { container } = renderSection([], [])
    expect(container.innerHTML).toBe('')
  })

  it('shows heading with total count', () => {
    renderSection()
    expect(screen.getByText('My Highlights & Notes')).toBeInTheDocument()
    expect(screen.getByText('3 items')).toBeInTheDocument()
  })

  it('shows entries sorted newest first', () => {
    renderSection()
    // The note at 10:30 should be first, then highlight at 10:00, then highlight at 09:00
    const buttons = screen.getAllByRole('button')
    // First button is the note (newest)
    expect(buttons[0]).toHaveTextContent('Beautiful beginning of creation.')
  })

  it('shows color dot for highlight entries with color name', async () => {
    renderSection()
    // 2 highlights => 2 colored dots with human-readable color names
    const dots = document.querySelectorAll('[aria-label^="Highlighted in"]')
    expect(dots.length).toBe(2)
    expect(dots[0]).toHaveAttribute('aria-label', 'Highlighted in yellow')
    expect(dots[1]).toHaveAttribute('aria-label', 'Highlighted in green')
  })

  it('shows note preview text', () => {
    renderSection()
    expect(screen.getByText('Beautiful beginning of creation.')).toBeInTheDocument()
  })

  it('shows reference text', async () => {
    renderSection()
    // Should show Genesis 1:1 references
    const refs = screen.getAllByText(/Genesis 1:\d/)
    expect(refs.length).toBeGreaterThan(0)
  })

  it('navigates to verse on click', () => {
    renderSection()
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/bible/genesis/1#verse-'))
  })

  it('loads verse text lazily', async () => {
    renderSection()
    await waitFor(() => {
      const texts = screen.getAllByText('In the beginning, God created the heavens and the earth.')
      expect(texts.length).toBeGreaterThan(0)
    })
  })

  it('shows "Show more" when more than 20 items', () => {
    const manyHighlights = Array.from({ length: 25 }, (_, i) => ({
      book: 'genesis',
      chapter: 1,
      verseNumber: (i % 30) + 1,
      color: '#FBBF24',
      createdAt: new Date(2026, 2, 22, 0, 0, i).toISOString(),
    }))
    renderSection(manyHighlights, [])
    expect(screen.getByText('Show more')).toBeInTheDocument()
  })

  it('does not show "Show more" when 20 or fewer items', () => {
    renderSection()
    expect(screen.queryByText('Show more')).not.toBeInTheDocument()
  })

  it('verse with both highlight and note shows as 2 entries', () => {
    // Genesis 1:1 has both a highlight and a note
    renderSection()
    // Count all entries with Genesis 1:1 reference
    const refs = screen.getAllByText('Genesis 1:1')
    expect(refs.length).toBe(2) // One for highlight, one for note
  })
})
