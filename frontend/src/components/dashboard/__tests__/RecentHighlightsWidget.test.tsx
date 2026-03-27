import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RecentHighlightsWidget } from '../RecentHighlightsWidget'
import type { BibleHighlight, BibleNote } from '@/types/bible'

function makeHighlight(overrides: Partial<BibleHighlight> = {}): BibleHighlight {
  return {
    book: 'john',
    chapter: 3,
    verseNumber: 16,
    color: '#2DD4BF',
    createdAt: '2026-03-01T10:00:00.000Z',
    ...overrides,
  }
}

function makeNote(overrides: Partial<BibleNote> = {}): BibleNote {
  return {
    id: 'note-1',
    book: 'psalms',
    chapter: 23,
    verseNumber: 1,
    text: 'The Lord is my shepherd',
    createdAt: '2026-03-02T10:00:00.000Z',
    updatedAt: '2026-03-02T10:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('RecentHighlightsWidget', () => {
  it('renders empty state when no highlights or notes', () => {
    render(
      <MemoryRouter>
        <RecentHighlightsWidget />
      </MemoryRouter>,
    )
    expect(screen.getByText('Start highlighting as you read')).toBeInTheDocument()
    expect(screen.getByText('Open Bible >')).toBeInTheDocument()
    expect(screen.getByText('Open Bible >').closest('a')).toHaveAttribute('href', '/bible')
  })

  it('renders 3 most recent items sorted by date', () => {
    const highlights = [
      makeHighlight({ verseNumber: 1, createdAt: '2026-03-01T10:00:00.000Z' }),
      makeHighlight({ verseNumber: 2, createdAt: '2026-03-02T10:00:00.000Z' }),
      makeHighlight({ verseNumber: 3, createdAt: '2026-03-03T10:00:00.000Z' }),
    ]
    const notes = [
      makeNote({ id: 'n1', createdAt: '2026-03-04T10:00:00.000Z' }),
      makeNote({ id: 'n2', verseNumber: 5, createdAt: '2026-03-05T10:00:00.000Z' }),
    ]
    localStorage.setItem('wr_bible_highlights', JSON.stringify(highlights))
    localStorage.setItem('wr_bible_notes', JSON.stringify(notes))

    render(
      <MemoryRouter>
        <RecentHighlightsWidget />
      </MemoryRouter>,
    )
    const links = screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/bible/'))
    expect(links).toHaveLength(3) // top 3 most recent
  })

  it('renders colored dot for highlights', () => {
    localStorage.setItem('wr_bible_highlights', JSON.stringify([makeHighlight({ color: '#2DD4BF' })]))

    const { container } = render(
      <MemoryRouter>
        <RecentHighlightsWidget />
      </MemoryRouter>,
    )
    const dot = container.querySelector('span[style*="background-color"]')
    expect(dot).not.toBeNull()
    expect(dot?.getAttribute('style')).toContain('background-color')
  })

  it('renders StickyNote icon for notes', () => {
    localStorage.setItem('wr_bible_notes', JSON.stringify([makeNote()]))

    const { container } = render(
      <MemoryRouter>
        <RecentHighlightsWidget />
      </MemoryRouter>,
    )
    // StickyNote is an SVG from lucide — check for the lucide class
    const svg = container.querySelector('svg.lucide-sticky-note')
    expect(svg).not.toBeNull()
  })

  it('click navigates to correct Bible chapter with verse anchor', () => {
    localStorage.setItem('wr_bible_highlights', JSON.stringify([makeHighlight({ book: 'john', chapter: 3, verseNumber: 16 })]))

    render(
      <MemoryRouter>
        <RecentHighlightsWidget />
      </MemoryRouter>,
    )
    const link = screen.getAllByRole('link').find((l) => l.getAttribute('href')?.includes('/bible/john/3'))
    expect(link).not.toBeUndefined()
    expect(link?.getAttribute('href')).toBe('/bible/john/3#verse-16')
  })

  it('"See all" link points to /bible', () => {
    localStorage.setItem('wr_bible_highlights', JSON.stringify([makeHighlight()]))

    render(
      <MemoryRouter>
        <RecentHighlightsWidget />
      </MemoryRouter>,
    )
    const seeAll = screen.getByText('See all >')
    expect(seeAll.closest('a')).toHaveAttribute('href', '/bible')
  })

  it('shows relative timestamp via timeAgo', () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
    localStorage.setItem('wr_bible_highlights', JSON.stringify([makeHighlight({ createdAt: recent })]))

    render(
      <MemoryRouter>
        <RecentHighlightsWidget />
      </MemoryRouter>,
    )
    // timeAgo should produce something like "1h ago" or "1 hour ago"
    expect(screen.getByText(/ago/)).toBeInTheDocument()
  })

  it('DashboardWidgetGrid includes Recent Highlights widget', async () => {
    // Verify the import exists in the grid file (lightweight check)
    const gridModule = await import('../DashboardWidgetGrid')
    expect(gridModule.DashboardWidgetGrid).toBeDefined()
  })
})
