import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { QuickLiftOverlay } from '@/components/prayer-wall/QuickLiftOverlay'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(() => new Promise(() => {})), // never resolves — keep state in 'starting'
}))

vi.mock('@/lib/quickLiftSound', () => ({
  playWindChime: vi.fn(),
}))

describe('QuickLiftOverlay', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduce') ? false : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog with role + aria-modal + aria-labelledby', () => {
    render(
      <QuickLiftOverlay
        isOpen={true}
        postId="post-1"
        postExcerpt="Please pray for me"
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby')
  })

  it('renders a progressbar with aria-valuenow', () => {
    render(
      <QuickLiftOverlay
        isOpen={true}
        postId="post-1"
        postExcerpt="Please pray for me"
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    )
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('aria-valuenow')
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
  })

  it('cancels on X close button click', () => {
    const onCancel = vi.fn()
    render(
      <QuickLiftOverlay
        isOpen={true}
        postId="post-1"
        postExcerpt="Please pray for me"
        onCancel={onCancel}
        onComplete={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('quick-lift-overlay-close'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not render any countdown digit + (second|%|left|remaining) text', () => {
    render(
      <QuickLiftOverlay
        isOpen={true}
        postId="post-1"
        postExcerpt="Please pray for me"
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    )
    const text = screen.getByRole('dialog').textContent ?? ''
    expect(text).not.toMatch(/\d+\s*(second|sec\b|%|left|remaining)/i)
  })

  it('returns null when isOpen=false', () => {
    const { container } = render(
      <QuickLiftOverlay
        isOpen={false}
        postId="post-1"
        postExcerpt="Please pray for me"
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
