import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { HighlightCard } from '../HighlightCard'
import { addCard, removeCard, getAllCards, _resetForTesting } from '@/lib/memorize'

const baseProps = {
  data: { type: 'highlight' as const, color: 'peace' as const },
  verseText: 'For God so loved the world...',
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
}

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
})

describe('HighlightCard memorize affordance (Spec 8B Change 8 — real-store BB-45 pattern)', () => {
  it('renders Layers icon when verse not in deck', () => {
    render(<HighlightCard {...baseProps} />)
    expect(screen.getByLabelText('Add to memorization deck')).toBeInTheDocument()
  })

  it('renders "In deck" label when verse is in deck', () => {
    addCard({
      book: 'john',
      bookName: 'John',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      verseText: 'For God so loved the world...',
      reference: 'John 3:16',
    })
    render(<HighlightCard {...baseProps} />)
    expect(screen.getByText('In deck')).toBeInTheDocument()
  })

  it('clicking Add icon adds verse to the real deck', () => {
    render(<HighlightCard {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Add to memorization deck'))
    const cards = getAllCards()
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      book: 'john',
      bookName: 'John',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      verseText: 'For God so loved the world...',
      reference: 'John 3:16',
    })
  })

  it('clicking "In deck" removes from the real deck', () => {
    addCard({
      book: 'john',
      bookName: 'John',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      verseText: 'For God so loved the world...',
      reference: 'John 3:16',
    })
    render(<HighlightCard {...baseProps} />)
    fireEvent.click(screen.getByLabelText('In memorization deck'))
    expect(getAllCards()).toHaveLength(0)
  })

  it('updates "In deck" badge reactively when card added externally (BB-45 subscription verification)', async () => {
    render(<HighlightCard {...baseProps} />)
    expect(screen.getByLabelText('Add to memorization deck')).toBeInTheDocument()

    act(() => {
      addCard({
        book: 'john',
        bookName: 'John',
        chapter: 3,
        startVerse: 16,
        endVerse: 16,
        verseText: 'For God so loved the world...',
        reference: 'John 3:16',
      })
    })

    expect(await screen.findByText('In deck')).toBeInTheDocument()
  })

  it('updates "In deck" badge reactively when card removed externally', async () => {
    const card = addCard({
      book: 'john',
      bookName: 'John',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      verseText: 'For God so loved the world...',
      reference: 'John 3:16',
    })
    render(<HighlightCard {...baseProps} />)
    expect(screen.getByText('In deck')).toBeInTheDocument()

    act(() => {
      removeCard(card.id)
    })

    expect(await screen.findByLabelText('Add to memorization deck')).toBeInTheDocument()
  })

  it('click stops propagation', () => {
    const parentClick = vi.fn()
    render(
      <div onClick={parentClick}>
        <HighlightCard {...baseProps} />
      </div>,
    )
    fireEvent.click(screen.getByLabelText('Add to memorization deck'))
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('hides affordance when verse info missing', () => {
    const { data, verseText } = baseProps
    render(<HighlightCard data={data} verseText={verseText} />)
    expect(screen.queryByLabelText(/memorization deck/)).not.toBeInTheDocument()
  })

  it('hides affordance when verseText is null', () => {
    render(<HighlightCard {...baseProps} verseText={null} />)
    expect(screen.queryByLabelText(/memorization deck/)).not.toBeInTheDocument()
  })
})
