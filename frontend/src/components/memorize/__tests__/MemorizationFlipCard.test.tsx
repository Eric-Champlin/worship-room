import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemorizationFlipCard } from '../MemorizationFlipCard'
import type { MemorizationCard } from '@/types/memorize'

const makeCard = (overrides?: Partial<MemorizationCard>): MemorizationCard => ({
  id: 'card-1',
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verseText:
    'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
  reference: 'John 3:16',
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 21, // 3 weeks ago
  lastReviewedAt: null,
  reviewCount: 0,
  ...overrides,
})

describe('MemorizationFlipCard', () => {
  it('renders reference on front', () => {
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={vi.fn()} />,
    )
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
  })

  it('renders verse text on back after flip', () => {
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={vi.fn()} />,
    )
    const button = screen.getByRole('button', { name: /flip card to reveal verse text/i })
    fireEvent.click(button)
    expect(screen.getByText(/For God so loved the world/)).toBeInTheDocument()
  })

  it('flip button is a real <button> with aria-pressed (Spec 8B Change 9c)', () => {
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={vi.fn()} />,
    )
    const button = screen.getByRole('button', { name: /flip card/i })
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onReview when flipping front to back', async () => {
    const onReview = vi.fn()
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={onReview} />,
    )
    const button = screen.getByRole('button', { name: /flip card to reveal verse text/i })
    fireEvent.click(button)
    await new Promise(queueMicrotask) // onReview is deferred via queueMicrotask
    expect(onReview).toHaveBeenCalledWith('card-1')
  })

  it('does NOT call onReview when flipping back to front', async () => {
    const onReview = vi.fn()
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={onReview} />,
    )
    const button = screen.getByRole('button', { name: /flip card/i })
    fireEvent.click(button) // front → back
    fireEvent.click(button) // back → front
    await new Promise(queueMicrotask) // flush deferred onReview
    expect(onReview).toHaveBeenCalledTimes(1)
  })

  it('shows remove confirmation on X click', () => {
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={vi.fn()} />,
    )
    const removeButton = screen.getByLabelText(/remove john 3:16 from memorization deck/i)
    fireEvent.click(removeButton)
    expect(screen.getByText(/^Remove\?$/)).toBeInTheDocument()
  })

  it('calls onRemove on Yes confirmation', () => {
    const onRemove = vi.fn()
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={onRemove} onReview={vi.fn()} />,
    )
    const removeButton = screen.getByLabelText(/remove john 3:16 from memorization deck/i)
    fireEvent.click(removeButton)
    const yesButton = screen.getByRole('button', { name: /^Yes$/ })
    fireEvent.click(yesButton)
    expect(onRemove).toHaveBeenCalledWith('card-1')
  })

  it('cancels remove on Cancel', () => {
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={vi.fn()} />,
    )
    const removeButton = screen.getByLabelText(/remove john 3:16 from memorization deck/i)
    fireEvent.click(removeButton)
    const cancelButton = screen.getByRole('button', { name: /^Cancel$/ })
    fireEvent.click(cancelButton)
    // Confirmation should be gone
    expect(screen.queryByText(/^Remove\?$/)).not.toBeInTheDocument()
  })

  it('remove button is a sibling of the flip button (not nested)', () => {
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={vi.fn()} />,
    )
    const flipButton = screen.getByRole('button', { name: /flip card/i })
    const removeButton = screen.getByLabelText(/remove john 3:16 from memorization deck/i)
    // Native HTML doesn't allow nested <button>; verify they don't share an ancestor button
    expect(flipButton.contains(removeButton)).toBe(false)
    expect(removeButton.contains(flipButton)).toBe(false)
  })

  it('remove button does not flip the card', async () => {
    const onReview = vi.fn()
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={onReview} />,
    )
    const removeButton = screen.getByLabelText(/remove john 3:16 from memorization deck/i)
    fireEvent.click(removeButton)
    await new Promise(queueMicrotask)
    expect(onReview).not.toHaveBeenCalled()
  })

  it('displays relative date added', () => {
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={vi.fn()} />,
    )
    // One date label per face = 2 occurrences
    const dateTexts = screen.getAllByText(/Added /)
    expect(dateTexts.length).toBeGreaterThanOrEqual(1)
  })

  it('long verse text has scrollable container', () => {
    const longText = 'A'.repeat(500)
    render(
      <MemorizationFlipCard
        card={makeCard({ verseText: longText })}
        onRemove={vi.fn()}
        onReview={vi.fn()}
      />,
    )
    const verseEl = screen.getByText(longText)
    expect(verseEl.parentElement).toHaveClass('overflow-y-auto')
  })

  it('uses FrostedCard chrome on faces (Spec 8B Change 9a/9b)', () => {
    const { container } = render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={vi.fn()} />,
    )
    // Both face elements should have FrostedCard's signature chrome
    const faces = container.querySelectorAll('[class*="bg-white/[0.07]"]')
    expect(faces.length).toBe(2)
    for (const face of faces) {
      expect(face.className).toContain('rounded-2xl')
      expect(face.className).toContain('border-white/[0.12]')
    }
  })
})
