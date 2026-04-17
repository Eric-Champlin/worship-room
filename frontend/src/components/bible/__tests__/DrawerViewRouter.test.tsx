import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BibleDrawerProvider, useBibleDrawer } from '../BibleDrawerProvider'
import { DrawerViewRouter } from '../DrawerViewRouter'

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
    // Instant swap — no transition to wait on
    expect(screen.getByRole('heading', { name: 'Obadiah' })).toBeInTheDocument()
  })

  it('pushView swaps instantly — only current view rendered', () => {
    const { getCtx } = renderRouter()
    act(() => getCtx().open())

    // Start in books view
    expect(screen.getByPlaceholderText('Find a book')).toBeInTheDocument()

    // Push chapters view
    act(() => getCtx().pushView({ type: 'chapters', bookSlug: 'obadiah' }))

    // No dual-mount: outgoing (books) is gone, only chapters visible
    expect(screen.queryByPlaceholderText('Find a book')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Obadiah' })).toBeInTheDocument()
  })

  it('no slide animation classes applied after view change', () => {
    const { getCtx, container } = renderRouter()
    act(() => getCtx().open())
    act(() => getCtx().pushView({ type: 'chapters', bookSlug: 'obadiah' }))

    // None of the removed slide animation classes should appear anywhere
    expect(container.querySelector('.animate-view-slide-in')).toBeNull()
    expect(container.querySelector('.animate-view-slide-out')).toBeNull()
    expect(container.querySelector('.animate-view-slide-back-in')).toBeNull()
  })

  it('VIEW_COMPONENTS maps books and chapters types', () => {
    const { getCtx } = renderRouter()

    // Books view
    expect(screen.getByPlaceholderText('Find a book')).toBeInTheDocument()

    // Chapters view
    act(() => getCtx().open({ type: 'chapters', bookSlug: 'obadiah' }))
    expect(screen.getByRole('heading', { name: 'Obadiah' })).toBeInTheDocument()
  })
})
