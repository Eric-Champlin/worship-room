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
  verseText: 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
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

  it('flips with Enter key', async () => {
    const onReview = vi.fn()
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={onReview} />,
    )
    const button = screen.getByRole('button', { name: /flip card/i })
    fireEvent.keyDown(button, { key: 'Enter' })
    await new Promise(queueMicrotask) // onReview is deferred via queueMicrotask
    expect(onReview).toHaveBeenCalledWith('card-1')
  })

  it('flips with Space key', async () => {
    const onReview = vi.fn()
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={onReview} />,
    )
    const button = screen.getByRole('button', { name: /flip card/i })
    fireEvent.keyDown(button, { key: ' ' })
    await new Promise(queueMicrotask) // onReview is deferred via queueMicrotask
    expect(onReview).toHaveBeenCalledWith('card-1')
  })

  it('shows remove confirmation on X click', () => {
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={vi.fn()} />,
    )
    const removeButton = screen.getAllByLabelText(/remove john 3:16 from memorization deck/i)[0]
    fireEvent.click(removeButton)
    expect(screen.getAllByText('Remove this card?').length).toBeGreaterThan(0)
  })

  it('calls onRemove on Yes confirmation', () => {
    const onRemove = vi.fn()
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={onRemove} onReview={vi.fn()} />,
    )
    const removeButton = screen.getAllByLabelText(/remove john 3:16 from memorization deck/i)[0]
    fireEvent.click(removeButton)
    const yesButton = screen.getAllByText('Yes')[0]
    fireEvent.click(yesButton)
    expect(onRemove).toHaveBeenCalledWith('card-1')
  })

  it('cancels remove on Cancel', () => {
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={vi.fn()} />,
    )
    const removeButton = screen.getAllByLabelText(/remove john 3:16 from memorization deck/i)[0]
    fireEvent.click(removeButton)
    const cancelButton = screen.getAllByText('Cancel')[0]
    fireEvent.click(cancelButton)
    // Confirmation should be gone, remove button should be back
    expect(screen.queryByText('Remove this card?')).not.toBeInTheDocument()
  })

  it('remove button stops propagation (no flip)', () => {
    const onReview = vi.fn()
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={onReview} />,
    )
    const removeButton = screen.getAllByLabelText(/remove john 3:16 from memorization deck/i)[0]
    fireEvent.click(removeButton)
    expect(onReview).not.toHaveBeenCalled()
  })

  it('displays relative date added', () => {
    render(
      <MemorizationFlipCard card={makeCard()} onRemove={vi.fn()} onReview={vi.fn()} />,
    )
    // Should show something like "Added 3 weeks ago"
    const dateTexts = screen.getAllByText(/Added /)
    expect(dateTexts.length).toBeGreaterThan(0)
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
    // The back face container should have overflow-y-auto
    const verseEl = screen.getByText(longText)
    expect(verseEl.parentElement).toHaveClass('overflow-y-auto')
  })
})
