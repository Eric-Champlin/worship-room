import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ActivityActionMenu } from '../ActivityActionMenu'
import type { ActivityItem } from '@/types/my-bible'

vi.mock('@/lib/bible/highlightStore', () => ({
  updateHighlightColor: vi.fn(),
  removeHighlightsInRange: vi.fn(),
}))

vi.mock('@/lib/bible/bookmarkStore', () => ({
  setBookmarkLabel: vi.fn(),
  removeBookmark: vi.fn(),
}))

vi.mock('@/lib/bible/notes/store', () => ({
  deleteNote: vi.fn(),
}))

vi.mock('@/lib/bible/navigateToActivityItem', () => ({
  navigateToActivityItem: vi.fn(),
}))

import { updateHighlightColor, removeHighlightsInRange } from '@/lib/bible/highlightStore'
import { removeBookmark } from '@/lib/bible/bookmarkStore'
import { deleteNote } from '@/lib/bible/notes/store'

const mockOnClose = vi.fn()
const mockOnMutate = vi.fn()

function makeItem(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    type: 'highlight',
    id: 'hl-1',
    createdAt: 1000,
    updatedAt: 1000,
    book: 'john',
    bookName: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    data: { type: 'highlight', color: 'joy' },
    ...overrides,
  }
}

function renderMenu(item: ActivityItem) {
  return render(
    <MemoryRouter>
      <ActivityActionMenu
        item={item}
        position={{ x: 100, y: 200 }}
        onClose={mockOnClose}
        onMutate={mockOnMutate}
      />
    </MemoryRouter>,
  )
}

describe('ActivityActionMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.matchMedia for isMobile check
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('renders highlight actions', () => {
    renderMenu(makeItem())
    expect(screen.getByText('Change color')).toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
    expect(screen.getByText('Open in reader')).toBeInTheDocument()
  })

  it('renders bookmark actions', () => {
    renderMenu(makeItem({ type: 'bookmark', data: { type: 'bookmark' } }))
    expect(screen.getByText('Edit label')).toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
    expect(screen.getByText('Open in reader')).toBeInTheDocument()
  })

  it('renders note actions', () => {
    renderMenu(makeItem({ type: 'note', data: { type: 'note', body: 'text' } }))
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Open in reader')).toBeInTheDocument()
  })

  it('renders meditation actions', () => {
    renderMenu(makeItem({
      type: 'meditation',
      data: { type: 'meditation', meditationType: 'soaking', durationMinutes: 10, reference: 'John 3:16' },
    }))
    expect(screen.getByText('Open in reader')).toBeInTheDocument()
  })

  it('change color calls updateHighlightColor', async () => {
    const user = userEvent.setup()
    renderMenu(makeItem())
    await user.click(screen.getByLabelText('Change to Peace'))
    expect(updateHighlightColor).toHaveBeenCalledWith('hl-1', 'peace')
  })

  it('remove highlight calls removeHighlightsInRange', async () => {
    const user = userEvent.setup()
    renderMenu(makeItem())
    await user.click(screen.getByText('Remove'))
    expect(removeHighlightsInRange).toHaveBeenCalled()
  })

  it('remove bookmark calls removeBookmark', async () => {
    const user = userEvent.setup()
    renderMenu(makeItem({ type: 'bookmark', data: { type: 'bookmark' } }))
    await user.click(screen.getByText('Remove'))
    expect(removeBookmark).toHaveBeenCalledWith('hl-1')
  })

  it('delete note shows confirm dialog', async () => {
    const user = userEvent.setup()
    renderMenu(makeItem({ type: 'note', data: { type: 'note', body: 'text' } }))
    await user.click(screen.getByText('Delete'))
    expect(screen.getByText('Delete this note?')).toBeInTheDocument()
  })

  it('delete note confirmed calls deleteNote', async () => {
    const user = userEvent.setup()
    renderMenu(makeItem({ type: 'note', data: { type: 'note', body: 'text' } }))
    // First click shows confirm
    await user.click(screen.getByText('Delete'))
    // Second click actually deletes
    await user.click(screen.getAllByText('Delete')[0])
    expect(deleteNote).toHaveBeenCalledWith('hl-1')
  })

  it('edit label shows inline input', async () => {
    const user = userEvent.setup()
    renderMenu(makeItem({ type: 'bookmark', data: { type: 'bookmark' } }))
    await user.click(screen.getByText('Edit label'))
    expect(screen.getByPlaceholderText('Add a label...')).toBeInTheDocument()
  })

  it('edit label saves on Enter', async () => {
    const user = userEvent.setup()
    renderMenu(makeItem({ type: 'bookmark', data: { type: 'bookmark' } }))
    await user.click(screen.getByText('Edit label'))
    const input = screen.getByPlaceholderText('Add a label...')
    await user.type(input, 'My label{Enter}')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes on click outside', async () => {
    const user = userEvent.setup()
    renderMenu(makeItem())
    // Click the backdrop overlay
    const backdrop = document.querySelector('[aria-hidden="true"]')
    if (backdrop) {
      await user.click(backdrop)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    renderMenu(makeItem())
    await user.keyboard('{Escape}')
    expect(mockOnClose).toHaveBeenCalled()
  })
})
