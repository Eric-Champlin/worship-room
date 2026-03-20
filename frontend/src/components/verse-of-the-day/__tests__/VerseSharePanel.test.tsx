import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { VerseSharePanel } from '../VerseSharePanel'
import { ToastProvider } from '@/components/ui/Toast'

// Mock generateVerseImage
vi.mock('@/lib/verse-card-canvas', () => ({
  generateVerseImage: vi.fn(() =>
    Promise.resolve(new Blob(['test'], { type: 'image/png' })),
  ),
}))

const VERSE_TEXT = 'The Lord is my shepherd; I shall not want.'
const VERSE_REFERENCE = 'Psalm 23:1'

function renderPanel(props: { isOpen: boolean; onClose?: () => void }) {
  const triggerRef = { current: document.createElement('button') }
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <VerseSharePanel
          verseText={VERSE_TEXT}
          verseReference={VERSE_REFERENCE}
          isOpen={props.isOpen}
          onClose={props.onClose ?? vi.fn()}
          triggerRef={triggerRef}
        />
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('VerseSharePanel', () => {
  it('renders three menu items when open', () => {
    renderPanel({ isOpen: true })

    expect(screen.getByText('Copy verse')).toBeInTheDocument()
    expect(screen.getByText('Share as image')).toBeInTheDocument()
    expect(screen.getByText('Download image')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    renderPanel({ isOpen: false })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByText('Copy verse')).not.toBeInTheDocument()
  })

  it('copy verse calls clipboard API and shows toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    renderPanel({ isOpen: true })

    // Use fireEvent instead of userEvent to avoid clipboard interception
    fireEvent.click(screen.getByText('Copy verse'))

    // Wait for async clipboard operation
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `"${VERSE_TEXT}" — ${VERSE_REFERENCE}`,
      )
    })
  })

  it('panel closes on Escape', () => {
    const onClose = vi.fn()
    renderPanel({ isOpen: true, onClose })

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('panel closes on click outside', () => {
    const onClose = vi.fn()
    renderPanel({ isOpen: true, onClose })

    fireEvent.mouseDown(document.body)

    expect(onClose).toHaveBeenCalled()
  })

  it('keyboard navigation works (ArrowDown/ArrowUp)', async () => {
    renderPanel({ isOpen: true })

    const items = screen.getAllByRole('menuitem')
    expect(items).toHaveLength(3)

    // Focus first item
    items[0].focus()
    expect(document.activeElement).toBe(items[0])

    // ArrowDown moves to second
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])

    // ArrowDown moves to third
    fireEvent.keyDown(items[1], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[2])

    // ArrowUp moves back to second
    fireEvent.keyDown(items[2], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[1])
  })

  it('items have role="menuitem"', () => {
    renderPanel({ isOpen: true })

    const items = screen.getAllByRole('menuitem')
    expect(items).toHaveLength(3)
  })

  it('panel has role="menu"', () => {
    renderPanel({ isOpen: true })

    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('menu items have min touch target 44px', () => {
    renderPanel({ isOpen: true })

    const items = screen.getAllByRole('menuitem')
    for (const item of items) {
      expect(item.className).toContain('min-h-[44px]')
    }
  })

  it('download triggers anchor click', async () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })

    const mockClick = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: mockClick })
      }
      return el
    })

    renderPanel({ isOpen: true })
    const user = userEvent.setup()

    await user.click(screen.getByText('Download image'))

    expect(createObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()
  })
})
