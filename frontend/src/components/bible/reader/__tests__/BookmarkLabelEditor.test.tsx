import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BookmarkLabelEditor } from '../BookmarkLabelEditor'
import type { VerseSelection } from '@/types/verse-actions'
import { toggleBookmark, setBookmarkLabel, _resetCacheForTesting } from '@/lib/bible/bookmarkStore'

vi.mock('@/lib/bible/bookmarkStore', async () => {
  const actual = await vi.importActual('@/lib/bible/bookmarkStore')
  return {
    ...actual,
    toggleBookmark: vi.fn((actual as Record<string, unknown>).toggleBookmark as () => void),
    setBookmarkLabel: vi.fn((actual as Record<string, unknown>).setBookmarkLabel as () => void),
  }
})

const SELECTION: VerseSelection = {
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verses: [{ number: 16, text: 'For God so loved the world...' }],
}

function createAnchorRef() {
  const button = document.createElement('button')
  button.getBoundingClientRect = () => ({
    top: 100,
    bottom: 140,
    left: 200,
    right: 240,
    width: 40,
    height: 40,
    x: 200,
    y: 100,
    toJSON: () => ({}),
  })
  return { current: button }
}

describe('BookmarkLabelEditor', () => {
  beforeEach(() => {
    localStorage.clear()
    _resetCacheForTesting()
    vi.clearAllMocks()
  })

  it('renders input with current label', () => {
    render(
      <BookmarkLabelEditor
        bookmarkId="bm-1"
        currentLabel="For Monday"
        selection={SELECTION}
        anchorRef={createAnchorRef()}
        onClose={vi.fn()}
      />,
    )

    const input = screen.getByPlaceholderText('Add a label...')
    expect(input).toBeTruthy()
    expect((input as HTMLInputElement).value).toBe('For Monday')
  })

  it('shows character counter', () => {
    render(
      <BookmarkLabelEditor
        bookmarkId="bm-1"
        currentLabel="Hello"
        selection={SELECTION}
        anchorRef={createAnchorRef()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('5 / 80')).toBeTruthy()
  })

  it('Enter key saves', () => {
    const onClose = vi.fn()
    render(
      <BookmarkLabelEditor
        bookmarkId="bm-1"
        currentLabel="My label"
        selection={SELECTION}
        anchorRef={createAnchorRef()}
        onClose={onClose}
      />,
    )

    const input = screen.getByPlaceholderText('Add a label...')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(setBookmarkLabel).toHaveBeenCalledWith('bm-1', 'My label')
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape key cancels', () => {
    const onClose = vi.fn()
    render(
      <BookmarkLabelEditor
        bookmarkId="bm-1"
        currentLabel=""
        selection={SELECTION}
        anchorRef={createAnchorRef()}
        onClose={onClose}
      />,
    )

    const input = screen.getByPlaceholderText('Add a label...')
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(setBookmarkLabel).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('Save with empty label clears label', () => {
    const onClose = vi.fn()
    render(
      <BookmarkLabelEditor
        bookmarkId="bm-1"
        currentLabel="Old label"
        selection={SELECTION}
        anchorRef={createAnchorRef()}
        onClose={onClose}
      />,
    )

    const input = screen.getByPlaceholderText('Add a label...')
    fireEvent.change(input, { target: { value: '' } })

    fireEvent.click(screen.getByText('Save'))

    expect(setBookmarkLabel).toHaveBeenCalledWith('bm-1', '')
    expect(onClose).toHaveBeenCalled()
  })

  it('Save on unbookmarked verse creates bookmark + sets label', () => {
    const mockResult = { created: true, bookmark: { id: 'new-bm-id' } }
    vi.mocked(toggleBookmark).mockReturnValue(mockResult as ReturnType<typeof toggleBookmark>)

    const onClose = vi.fn()
    render(
      <BookmarkLabelEditor
        bookmarkId={null}
        currentLabel=""
        selection={SELECTION}
        anchorRef={createAnchorRef()}
        onClose={onClose}
      />,
    )

    const input = screen.getByPlaceholderText('Add a label...')
    fireEvent.change(input, { target: { value: 'New label' } })
    fireEvent.click(screen.getByText('Save'))

    expect(toggleBookmark).toHaveBeenCalled()
    expect(setBookmarkLabel).toHaveBeenCalledWith('new-bm-id', 'New label')
    expect(onClose).toHaveBeenCalled()
  })
})
