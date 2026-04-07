import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BibleDrawer } from '../BibleDrawer'
import { Z } from '@/constants/z-index'

// Mock useReducedMotion
let mockReducedMotion = false
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

describe('BibleDrawer', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
    mockReducedMotion = false
    document.body.style.overflow = ''
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <BibleDrawer isOpen={false} onClose={onClose} ariaLabel="Test drawer">
        <p>Content</p>
      </BibleDrawer>
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog when isOpen is true', () => {
    render(
      <BibleDrawer isOpen={true} onClose={onClose} ariaLabel="Test drawer">
        <p>Content</p>
      </BibleDrawer>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has aria-modal and aria-label', () => {
    render(
      <BibleDrawer isOpen={true} onClose={onClose} ariaLabel="Books of the Bible">
        <p>Content</p>
      </BibleDrawer>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Books of the Bible')
  })

  it('renders children', () => {
    render(
      <BibleDrawer isOpen={true} onClose={onClose} ariaLabel="Test drawer">
        <p>Hello World</p>
      </BibleDrawer>
    )
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('calls onClose when backdrop clicked', () => {
    render(
      <BibleDrawer isOpen={true} onClose={onClose} ariaLabel="Test drawer">
        <p>Content</p>
      </BibleDrawer>
    )
    // The backdrop is the first child — an aria-hidden div
    const backdrop = document.querySelector('[aria-hidden="true"]')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape', () => {
    render(
      <BibleDrawer isOpen={true} onClose={onClose} ariaLabel="Test drawer">
        <button>Focusable</button>
      </BibleDrawer>
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks body scroll when open', () => {
    render(
      <BibleDrawer isOpen={true} onClose={onClose} ariaLabel="Test drawer">
        <p>Content</p>
      </BibleDrawer>
    )
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body scroll on unmount', () => {
    document.body.style.overflow = 'auto'
    const { unmount } = render(
      <BibleDrawer isOpen={true} onClose={onClose} ariaLabel="Test drawer">
        <p>Content</p>
      </BibleDrawer>
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('uses z-index from Z constants', () => {
    render(
      <BibleDrawer isOpen={true} onClose={onClose} ariaLabel="Test drawer">
        <p>Content</p>
      </BibleDrawer>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain(`z-[${Z.DRAWER}]`)
  })

  it('applies reduced motion styles', () => {
    mockReducedMotion = true
    render(
      <BibleDrawer isOpen={true} onClose={onClose} ariaLabel="Test drawer">
        <p>Content</p>
      </BibleDrawer>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).not.toContain('animate-drawer-slide-in')
  })
})
