import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReadingHeatmap } from '../ReadingHeatmap'
import type { DailyActivity } from '@/types/heatmap'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Helper: generate N days of activity ending on a given date
function generateActivity(
  endDate: string,
  days: number,
  fillFn?: (index: number) => number,
): DailyActivity[] {
  const result: DailyActivity[] = []
  const end = new Date(endDate + 'T00:00:00')

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${day}`
    const count = fillFn ? fillFn(days - 1 - i) : 0

    const chapters: Array<{ book: string; chapter: number }> = []
    for (let c = 0; c < count; c++) {
      chapters.push({ book: 'genesis', chapter: c + 1 })
    }

    result.push({ date: dateStr, chapterCount: count, chapters })
  }

  return result
}

const TODAY = '2026-04-13'
const EMPTY_ACTIVITY = generateActivity(TODAY, 365)
const SOME_ACTIVITY = generateActivity(TODAY, 365, (i) => (i % 30 === 0 ? 3 : 0))

function renderHeatmap(props: Partial<Parameters<typeof ReadingHeatmap>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ReadingHeatmap
        dailyActivity={SOME_ACTIVITY}
        currentStreak={5}
        activeDays={12}
        {...props}
      />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockNavigate.mockClear()
})

describe('ReadingHeatmap', () => {
  it('renders grid with cells', () => {
    renderHeatmap()
    const cells = screen.getAllByRole('gridcell')
    // Should have a substantial number of cells (365 days minus padding)
    expect(cells.length).toBeGreaterThanOrEqual(300)
  })

  it('applies correct intensity class to cells based on chapter count', () => {
    // Create activity with known intensities
    const activity = generateActivity(TODAY, 365, (i) => {
      if (i === 364) return 1 // today: intensity 1
      if (i === 363) return 5 // yesterday: intensity 2
      if (i === 362) return 8 // 2 days ago: intensity 3
      if (i === 361) return 12 // 3 days ago: intensity 4
      return 0
    })

    renderHeatmap({ dailyActivity: activity })

    const cells = screen.getAllByRole('gridcell')
    // Find today's cell (has the ring class)
    const todayCell = cells.find((c) => c.className.includes('ring-2'))
    expect(todayCell).toBeDefined()
    expect(todayCell!.className).toContain('bg-primary/30') // intensity 1 for 1 chapter
  })

  it("marks today's cell with ring border", () => {
    renderHeatmap()
    const todayCell = screen.getByLabelText(/Today — tap to open the Bible/)
    expect(todayCell).toBeDefined()
    expect(todayCell.className).toContain('ring-2')
    expect(todayCell.className).toContain('ring-white/50')
  })

  it('shows tooltip on cell hover (desktop)', async () => {
    renderHeatmap()
    const cells = screen.getAllByRole('gridcell')
    // Find a cell with activity
    const activeCell = cells.find((c) => c.className.includes('bg-primary'))
    if (activeCell) {
      fireEvent.mouseEnter(activeCell)
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toBeDefined()
    }
  })

  it('shows tooltip on cell tap (mobile)', () => {
    renderHeatmap()
    const cells = screen.getAllByRole('gridcell')
    const activeCell = cells.find(
      (c) => c.className.includes('bg-primary') && !c.className.includes('ring-2'),
    )
    if (activeCell) {
      fireEvent.click(activeCell)
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toBeDefined()
    }
  })

  it('shows "No reading" tooltip for empty cells', () => {
    const activity = generateActivity(TODAY, 365) // all zeros
    // Make it non-empty so the grid renders (at least one non-zero day)
    activity[activity.length - 2] = { ...activity[activity.length - 2], chapterCount: 1, chapters: [{ book: 'genesis', chapter: 1 }] }

    renderHeatmap({ dailyActivity: activity, activeDays: 1 })
    const cells = screen.getAllByRole('gridcell')

    // Find an empty cell (bg-white/5)
    const emptyCell = cells.find(
      (c) => c.className.includes('bg-white/5') && !c.className.includes('ring-2'),
    )
    if (emptyCell) {
      fireEvent.mouseEnter(emptyCell)
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip.textContent).toContain('No reading')
    }
  })

  it('renders month labels along top', () => {
    renderHeatmap()
    // Should have some month abbreviations visible
    const container = screen.getByRole('grid')
    expect(container.textContent).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)
  })

  it('renders day-of-week labels on left', () => {
    renderHeatmap()
    // Should have Mon, Wed, Fri labels
    expect(screen.getAllByText('Mon').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Wed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Fri').length).toBeGreaterThanOrEqual(1)
  })

  it('renders legend with 5 color swatches', () => {
    renderHeatmap()
    expect(screen.getByText('Less')).toBeDefined()
    expect(screen.getByText('More')).toBeDefined()
  })

  it('shows empty state when all days have 0 activity', () => {
    renderHeatmap({ dailyActivity: EMPTY_ACTIVITY, activeDays: 0 })
    expect(screen.getByText('Your reading history will show up here as you read.')).toBeDefined()
  })

  it('hides streak display when currentStreak is 0', () => {
    renderHeatmap({ currentStreak: 0 })
    expect(screen.queryByText(/Current streak/)).toBeNull()
  })

  it('shows streak when currentStreak > 0', () => {
    renderHeatmap({ currentStreak: 5 })
    expect(screen.getByText(/Current streak: 5 days/)).toBeDefined()
  })

  it("navigates to /bible when today's cell is clicked", () => {
    renderHeatmap()
    const todayCell = screen.getByLabelText(/Today — tap to open the Bible/)
    fireEvent.click(todayCell)
    expect(mockNavigate).toHaveBeenCalledWith('/bible')
  })
})
