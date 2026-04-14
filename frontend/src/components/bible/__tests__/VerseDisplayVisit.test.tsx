import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { VerseDisplay } from '../VerseDisplay'
import type { VerseDisplayProps } from '../VerseDisplay'

// Mock the chapter visit store
const mockRecordChapterVisit = vi.fn()
vi.mock('@/lib/heatmap/chapterVisitStore', () => ({
  recordChapterVisit: (...args: unknown[]) => mockRecordChapterVisit(...args),
}))

// Mock Toast
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const defaultProps: VerseDisplayProps = {
  verses: [
    { book: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning God created the heavens and the earth.' },
  ],
  book: { name: 'Genesis', slug: 'genesis', chapters: 50, hasFullText: true },
  chapterNumber: 1,
  isAuthenticated: true,
  getHighlightsForChapter: () => [],
  getHighlightForVerse: () => undefined,
  setHighlight: vi.fn(),
  getNotesForChapter: () => [],
  getNoteForVerse: () => undefined,
  saveNote: vi.fn(() => true),
  deleteNote: vi.fn(),
  currentVerseIndex: 0,
  isChapterRead: () => false,
  markChapterRead: vi.fn(),
  announce: vi.fn(),
}

function renderWithRouter(props: Partial<VerseDisplayProps> = {}) {
  return render(
    <MemoryRouter>
      <VerseDisplay {...defaultProps} {...props} />
    </MemoryRouter>,
  )
}

describe('VerseDisplay — chapter visit recording (BB-43)', () => {
  beforeEach(() => {
    mockRecordChapterVisit.mockClear()
  })

  it('records chapter visit on mount when authenticated', () => {
    renderWithRouter()
    expect(mockRecordChapterVisit).toHaveBeenCalledWith('genesis', 1)
    expect(mockRecordChapterVisit).toHaveBeenCalledTimes(1)
  })

  it('does not record when not authenticated', () => {
    renderWithRouter({ isAuthenticated: false })
    expect(mockRecordChapterVisit).not.toHaveBeenCalled()
  })

  it('does not record when verses array is empty', () => {
    renderWithRouter({ verses: [] })
    expect(mockRecordChapterVisit).not.toHaveBeenCalled()
  })

  it('records again when chapter changes', () => {
    const { rerender } = render(
      <MemoryRouter>
        <VerseDisplay {...defaultProps} />
      </MemoryRouter>,
    )
    expect(mockRecordChapterVisit).toHaveBeenCalledWith('genesis', 1)

    rerender(
      <MemoryRouter>
        <VerseDisplay {...defaultProps} chapterNumber={2} />
      </MemoryRouter>,
    )
    expect(mockRecordChapterVisit).toHaveBeenCalledWith('genesis', 2)
    expect(mockRecordChapterVisit).toHaveBeenCalledTimes(2)
  })
})
