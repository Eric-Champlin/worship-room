import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BibleProgressMap } from '../BibleProgressMap'
import { BIBLE_BOOKS } from '@/constants/bible'
import type { BookCoverage } from '@/types/heatmap'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

/** Generate coverage from BIBLE_BOOKS with optional overrides. */
function makeCoverage(overrides?: Record<string, { read?: number[]; highlighted?: number[] }>): BookCoverage[] {
  return BIBLE_BOOKS.map((b) => {
    const override = overrides?.[b.slug]
    return {
      name: b.name,
      slug: b.slug,
      testament: b.testament,
      totalChapters: b.chapters,
      readChapters: new Set(override?.read ?? []),
      highlightedChapters: new Set(override?.highlighted ?? []),
    }
  })
}

function renderMap(props: Partial<Parameters<typeof BibleProgressMap>[0]> = {}) {
  const defaultCoverage = makeCoverage({ genesis: { read: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] } })
  return render(
    <MemoryRouter>
      <BibleProgressMap
        coverage={defaultCoverage}
        totalChaptersRead={12}
        booksVisited={1}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('BibleProgressMap', () => {
  it('renders OT and NT section headings', () => {
    renderMap()
    expect(screen.getByText('Old Testament')).toBeDefined()
    expect(screen.getByText('New Testament')).toBeDefined()
  })

  it('renders all 66 book cards', () => {
    renderMap()
    // Each book has a button with its name
    for (const book of BIBLE_BOOKS) {
      expect(screen.getByText(book.name)).toBeDefined()
    }
  })

  it('renders correct chapter count per book', () => {
    renderMap()
    // Genesis has 12 read out of 50
    expect(screen.getByText('12 / 50 chapters')).toBeDefined()
  })

  it('chapter cells use correct 3-state colors', () => {
    const coverage = makeCoverage({
      genesis: { read: [1, 2], highlighted: [2, 3] },
    })
    renderMap({ coverage })

    // Chapter 1: read (not highlighted) — high-contrast fill (BB-51)
    const ch1 = screen.getByLabelText('Genesis chapter 1: read')
    expect(ch1.className).toContain('bg-white/80')

    // Chapter 2: highlighted (overrides read) — solid white, not an opacity variant
    const ch2 = screen.getByLabelText('Genesis chapter 2: highlighted')
    expect(ch2.className).toMatch(/\bbg-white\b(?!\/)/)

    // Chapter 3: highlighted (not read but highlighted)
    const ch3 = screen.getByLabelText('Genesis chapter 3: highlighted')
    expect(ch3.className).toMatch(/\bbg-white\b(?!\/)/)

    // Chapter 4: unread — near-invisible (BB-51)
    const ch4 = screen.getByLabelText('Genesis chapter 4: unread')
    expect(ch4.className).toContain('bg-white/[0.06]')
  })

  it('does not use purple color classes in progress map', () => {
    const coverage = makeCoverage({
      genesis: { read: [1, 2], highlighted: [2, 3] },
    })
    renderMap({ coverage })

    const cells = screen.getAllByRole('button')
    for (const cell of cells) {
      expect(cell.className).not.toMatch(/bg-primary/)
    }
  })

  it('navigates to chapter on cell click', () => {
    renderMap()
    const ch1 = screen.getByLabelText('Genesis chapter 1: read')
    fireEvent.click(ch1)
    expect(mockNavigate).toHaveBeenCalledWith('/bible/genesis/1')
  })

  it('navigates to book on name click', () => {
    mockNavigate.mockClear()
    renderMap()
    fireEvent.click(screen.getByText('Genesis'))
    expect(mockNavigate).toHaveBeenCalledWith('/bible/genesis/1')
  })

  it('shows correct total chapters read', () => {
    renderMap({ totalChaptersRead: 42 })
    const summary = screen.getByLabelText('Bible progress map').querySelector('p')
    expect(summary?.textContent).toContain('42')
    expect(summary?.textContent).toContain('1,189 chapters read')
  })

  it('shows correct books visited count', () => {
    renderMap({ booksVisited: 5 })
    const summary = screen.getByLabelText('Bible progress map').querySelector('p')
    expect(summary?.textContent).toContain('5')
    expect(summary?.textContent).toContain('66 books visited')
  })

  it('shows empty state when no chapters read', () => {
    const emptyCoverage = makeCoverage()
    renderMap({ coverage: emptyCoverage, totalChaptersRead: 0, booksVisited: 0 })
    expect(screen.getByText('Your reading map will show up here as you read.')).toBeDefined()
  })

  it('renders Psalms (150 chapters) with wrapped cells', () => {
    const coverage = makeCoverage({ psalms: { read: [23] } })
    renderMap({ coverage, totalChaptersRead: 1, booksVisited: 1 })
    // Should have 150 chapter cells for Psalms
    const psalmCells = screen.getAllByLabelText(/Psalms chapter \d+/)
    expect(psalmCells).toHaveLength(150)
  })

  it('renders Obadiah (1 chapter) correctly', () => {
    const coverage = makeCoverage()
    renderMap({ coverage, totalChaptersRead: 0, booksVisited: 0 })
    // Obadiah won't render in empty state, make it non-empty
    const nonEmptyCoverage = makeCoverage({ obadiah: { read: [1] } })
    const { container } = render(
      <MemoryRouter>
        <BibleProgressMap coverage={nonEmptyCoverage} totalChaptersRead={1} booksVisited={1} />
      </MemoryRouter>,
    )
    const obadiahCell = container.querySelector('[aria-label="Obadiah chapter 1: read"]')
    expect(obadiahCell).not.toBeNull()
  })

  it('responsive grid: 1 column on mobile', () => {
    renderMap()
    // The grid container has grid-cols-1 by default (mobile-first)
    const section = screen.getByLabelText('Bible progress map')
    const grids = section.querySelectorAll('.grid')
    // First grid (OT) should have grid-cols-1
    expect(grids[0].className).toContain('grid-cols-1')
  })
})
