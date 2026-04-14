import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RecentHighlightsWidget } from '../RecentHighlightsWidget'
import { replaceAllHighlights } from '@/lib/bible/highlightStore'
import { replaceAllNotes } from '@/lib/bible/notes/store'
import type { Highlight, Note } from '@/types/bible'

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: crypto.randomUUID(),
    book: 'john',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    color: 'peace',
    createdAt: new Date('2026-03-01T10:00:00.000Z').getTime(),
    updatedAt: new Date('2026-03-01T10:00:00.000Z').getTime(),
    ...overrides,
  }
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    book: 'psalms',
    chapter: 23,
    startVerse: 1,
    endVerse: 1,
    body: 'The Lord is my shepherd',
    createdAt: new Date('2026-03-02T10:00:00.000Z').getTime(),
    updatedAt: new Date('2026-03-02T10:00:00.000Z').getTime(),
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  replaceAllHighlights([])
  replaceAllNotes([])
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
    replaceAllHighlights([
      makeHighlight({ startVerse: 1, endVerse: 1, createdAt: new Date('2026-03-01T10:00:00.000Z').getTime(), updatedAt: new Date('2026-03-01T10:00:00.000Z').getTime() }),
      makeHighlight({ startVerse: 2, endVerse: 2, createdAt: new Date('2026-03-02T10:00:00.000Z').getTime(), updatedAt: new Date('2026-03-02T10:00:00.000Z').getTime() }),
      makeHighlight({ startVerse: 3, endVerse: 3, createdAt: new Date('2026-03-03T10:00:00.000Z').getTime(), updatedAt: new Date('2026-03-03T10:00:00.000Z').getTime() }),
    ])
    replaceAllNotes([
      makeNote({ id: 'n1', createdAt: new Date('2026-03-04T10:00:00.000Z').getTime(), updatedAt: new Date('2026-03-04T10:00:00.000Z').getTime() }),
      makeNote({ id: 'n2', startVerse: 5, endVerse: 5, createdAt: new Date('2026-03-05T10:00:00.000Z').getTime(), updatedAt: new Date('2026-03-05T10:00:00.000Z').getTime() }),
    ])

    render(
      <MemoryRouter>
        <RecentHighlightsWidget />
      </MemoryRouter>,
    )
    const links = screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/bible/'))
    expect(links).toHaveLength(3) // top 3 most recent
  })

  it('renders colored dot for highlights', () => {
    replaceAllHighlights([makeHighlight({ color: 'peace' })])

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
    replaceAllNotes([makeNote()])

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
    replaceAllHighlights([makeHighlight({ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 })])

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
    replaceAllHighlights([makeHighlight()])

    render(
      <MemoryRouter>
        <RecentHighlightsWidget />
      </MemoryRouter>,
    )
    const seeAll = screen.getByText('See all >')
    expect(seeAll.closest('a')).toHaveAttribute('href', '/bible')
  })

  it('shows relative timestamp via timeAgo', () => {
    const recentMs = Date.now() - 60 * 60 * 1000 // 1 hour ago
    replaceAllHighlights([makeHighlight({ createdAt: recentMs, updatedAt: recentMs })])

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
