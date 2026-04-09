import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityFilterBar } from '../ActivityFilterBar'
import { ColorFilterStrip } from '../ColorFilterStrip'
import type { ActivityFilter, ActivitySort } from '@/types/my-bible'

const DEFAULT_FILTER: ActivityFilter = { type: 'all', book: 'all', color: 'all' }
const DEFAULT_SORT: ActivitySort = 'recent'

function makeBookCounts(): Map<string, number> {
  const map = new Map<string, number>()
  map.set('john', 5)
  map.set('genesis', 3)
  map.set('psalms', 2)
  return map
}

describe('ActivityFilterBar', () => {
  const mockOnFilterChange = vi.fn()
  const mockOnSortChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  function renderFilterBar(filter = DEFAULT_FILTER, sort = DEFAULT_SORT) {
    return render(
      <ActivityFilterBar
        filter={filter}
        sort={sort}
        onFilterChange={mockOnFilterChange}
        onSortChange={mockOnSortChange}
        bookCounts={makeBookCounts()}
      />,
    )
  }

  it('renders all type pills', () => {
    renderFilterBar()
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Highlights')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Bookmarks')).toBeInTheDocument()
    expect(screen.getByText('From Daily Hub')).toBeInTheDocument()
  })

  it('clicking a type pill calls onFilterChange', async () => {
    const user = userEvent.setup()
    renderFilterBar()
    await user.click(screen.getByText('Notes'))
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'notes' }),
    )
  })

  it('active type pill has bg-primary', () => {
    renderFilterBar({ ...DEFAULT_FILTER, type: 'highlights' })
    const pill = screen.getByText('Highlights')
    expect(pill.className).toContain('bg-primary')
  })

  it('book dropdown shows only books with items', async () => {
    const user = userEvent.setup()
    renderFilterBar()
    await user.click(screen.getByText('All books'))
    // Should show john, genesis, psalms
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('Genesis')).toBeInTheDocument()
    expect(screen.getByText('Psalms')).toBeInTheDocument()
  })

  it('book dropdown shows item count', async () => {
    const user = userEvent.setup()
    renderFilterBar()
    await user.click(screen.getByText('All books'))
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('selecting book calls onFilterChange', async () => {
    const user = userEvent.setup()
    renderFilterBar()
    await user.click(screen.getByText('All books'))
    await user.click(screen.getByText('John'))
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ book: 'john' }),
    )
  })

  it('sort toggle switches', async () => {
    const user = userEvent.setup()
    renderFilterBar()
    await user.click(screen.getByText('Bible order'))
    expect(mockOnSortChange).toHaveBeenCalledWith('canonical')
  })

  it('filter bar is sticky', () => {
    const { container } = renderFilterBar()
    const bar = container.firstChild as HTMLElement
    expect(bar.className).toContain('sticky')
    expect(bar.className).toContain('top-16')
    expect(bar.className).toContain('z-30')
  })

  it('color filter resets when type changes from highlights', async () => {
    const user = userEvent.setup()
    renderFilterBar({ type: 'highlights', book: 'all', color: 'joy' })
    await user.click(screen.getByText('Notes'))
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'notes', color: 'all' }),
    )
  })
})

describe('ColorFilterStrip', () => {
  const mockOnColorChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all color chips', () => {
    render(<ColorFilterStrip activeColor="all" onColorChange={mockOnColorChange} />)
    expect(screen.getByLabelText('All colors')).toBeInTheDocument()
    expect(screen.getByLabelText('Peace')).toBeInTheDocument()
    expect(screen.getByLabelText('Conviction')).toBeInTheDocument()
    expect(screen.getByLabelText('Joy')).toBeInTheDocument()
    expect(screen.getByLabelText('Struggle')).toBeInTheDocument()
    expect(screen.getByLabelText('Promise')).toBeInTheDocument()
  })

  it('clicking a color chip calls onColorChange', async () => {
    const user = userEvent.setup()
    render(<ColorFilterStrip activeColor="all" onColorChange={mockOnColorChange} />)
    await user.click(screen.getByLabelText('Joy'))
    expect(mockOnColorChange).toHaveBeenCalledWith('joy')
  })

  it('"All" chip resets color filter', async () => {
    const user = userEvent.setup()
    render(<ColorFilterStrip activeColor="joy" onColorChange={mockOnColorChange} />)
    await user.click(screen.getByLabelText('All colors'))
    expect(mockOnColorChange).toHaveBeenCalledWith('all')
  })
})
