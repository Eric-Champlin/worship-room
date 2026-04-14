import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BibleDrawerProvider, useBibleDrawer } from '../BibleDrawerProvider'
import { DrawerViewRouter } from '../DrawerViewRouter'

// Mock useReducedMotion
const mockReducedMotion = vi.fn(() => false)
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion(),
}))

// Helper to drive the drawer from tests
function DrawerController({
  onReady,
}: {
  onReady: (ctx: ReturnType<typeof useBibleDrawer>) => void
}) {
  const ctx = useBibleDrawer()
  onReady(ctx)
  return null
}

function renderRouter() {
  let drawerCtx: ReturnType<typeof useBibleDrawer> | null = null
  const onClose = vi.fn()

  const utils = render(
    <MemoryRouter>
      <BibleDrawerProvider>
        <DrawerController onReady={(ctx) => (drawerCtx = ctx)} />
        <DrawerViewRouter onClose={onClose} />
      </BibleDrawerProvider>
    </MemoryRouter>,
  )

  return { ...utils, getCtx: () => drawerCtx!, onClose }
}

beforeEach(() => {
  localStorage.clear()
  mockReducedMotion.mockReturnValue(false)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DrawerViewRouter', () => {
  it('renders BooksDrawerContent when currentView is books', () => {
    renderRouter()
    // BooksDrawerContent renders its search input with "Find a book" placeholder
    expect(screen.getByPlaceholderText('Find a book')).toBeInTheDocument()
  })

  it('renders ChapterPickerView when currentView is chapters', () => {
    const { getCtx } = renderRouter()
    act(() => getCtx().open({ type: 'chapters', bookSlug: 'obadiah' }))
    act(() => vi.advanceTimersByTime(250))
    // ChapterPickerView shows the book name in a heading
    expect(screen.getByRole('heading', { name: 'Obadiah' })).toBeInTheDocument()
  })

  it('both views mounted during transition', () => {
    const { getCtx } = renderRouter()
    act(() => getCtx().open())

    // Start in books view
    expect(screen.getByPlaceholderText('Find a book')).toBeInTheDocument()

    // Push chapters view (use obadiah to avoid name collision with books list)
    act(() => getCtx().pushView({ type: 'chapters', bookSlug: 'obadiah' }))

    // During the 220ms transition, both views should be in the DOM
    expect(screen.getByPlaceholderText('Find a book')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Obadiah' })).toBeInTheDocument()
  })

  it('outgoing view unmounts after animation', () => {
    const { getCtx } = renderRouter()
    act(() => getCtx().open())
    act(() => getCtx().pushView({ type: 'chapters', bookSlug: 'obadiah' }))

    // Both mounted during transition
    expect(screen.getByPlaceholderText('Find a book')).toBeInTheDocument()

    // Advance past transition
    act(() => vi.advanceTimersByTime(250))

    // Outgoing (books) search should no longer be in DOM
    expect(screen.queryByPlaceholderText('Find a book')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Obadiah' })).toBeInTheDocument()
  })

  it('reduced motion skips animation — instant swap', () => {
    mockReducedMotion.mockReturnValue(true)
    const { getCtx } = renderRouter()
    act(() => getCtx().open())

    act(() => getCtx().pushView({ type: 'chapters', bookSlug: 'obadiah' }))

    // With reduced motion, there should be no dual-mount — only the new view
    expect(screen.queryByPlaceholderText('Find a book')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Obadiah' })).toBeInTheDocument()
  })

  it('VIEW_COMPONENTS maps books and chapters types', () => {
    const { getCtx } = renderRouter()

    // Books view
    expect(screen.getByPlaceholderText('Find a book')).toBeInTheDocument()

    // Chapters view
    act(() => getCtx().open({ type: 'chapters', bookSlug: 'obadiah' }))
    act(() => vi.advanceTimersByTime(250))
    expect(screen.getByRole('heading', { name: 'Obadiah' })).toBeInTheDocument()
  })
})
