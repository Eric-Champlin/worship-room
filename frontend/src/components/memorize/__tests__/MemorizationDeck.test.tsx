import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MemorizationDeck } from '../MemorizationDeck'
import { addCard, removeCard, recordReview, _resetForTesting } from '@/lib/memorize'

function seedCard(overrides?: {
  book?: string
  bookName?: string
  chapter?: number
  startVerse?: number
  endVerse?: number
  verseText?: string
  reference?: string
}) {
  return addCard({
    book: 'john',
    bookName: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    verseText: 'For God so loved the world...',
    reference: 'John 3:16',
    ...overrides,
  })
}

const renderDeck = () =>
  render(
    <MemoryRouter>
      <MemorizationDeck />
    </MemoryRouter>,
  )

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
})

describe('MemorizationDeck', () => {
  it('renders empty state when no cards', () => {
    renderDeck()
    expect(screen.getByText('Your memorization deck is ready')).toBeInTheDocument()
  })

  it('renders card count in summary', () => {
    seedCard({ startVerse: 1, endVerse: 1, reference: 'John 3:1' })
    seedCard({ startVerse: 2, endVerse: 2, reference: 'John 3:2' })
    seedCard({ startVerse: 3, endVerse: 3, reference: 'John 3:3' })
    renderDeck()
    expect(screen.getByText('3 cards in your deck')).toBeInTheDocument()
  })

  it('renders singular "card" for 1 card', () => {
    seedCard()
    renderDeck()
    expect(screen.getByText('1 card in your deck')).toBeInTheDocument()
  })

  it('renders last reviewed line when applicable', () => {
    const card = seedCard()
    recordReview(card.id)
    renderDeck()
    expect(screen.getByText(/Last reviewed John 3:16/)).toBeInTheDocument()
  })

  it('hides last reviewed line when no reviews', () => {
    seedCard()
    renderDeck()
    expect(screen.queryByText(/Last reviewed/)).not.toBeInTheDocument()
  })

  it('renders correct number of flip cards', () => {
    seedCard({ startVerse: 1, endVerse: 1, reference: 'John 3:1' })
    seedCard({ startVerse: 2, endVerse: 2, reference: 'John 3:2' })
    seedCard({ startVerse: 3, endVerse: 3, reference: 'John 3:3' })
    seedCard({ startVerse: 4, endVerse: 4, reference: 'John 3:4' })
    seedCard({ startVerse: 5, endVerse: 5, reference: 'John 3:5' })
    renderDeck()
    const flipButtons = screen.getAllByRole('button', { name: /flip card/i })
    expect(flipButtons).toHaveLength(5)
  })

  it('section heading says "Memorization deck"', () => {
    seedCard()
    renderDeck()
    expect(screen.getByRole('heading', { name: 'Memorization deck' })).toBeInTheDocument()
  })

  it('responsive grid classes applied', () => {
    seedCard()
    renderDeck()
    const grid = screen.getByRole('button', { name: /flip card/i }).closest('.grid')
    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).toHaveClass('sm:grid-cols-2')
    expect(grid).toHaveClass('lg:grid-cols-3')
  })

  it('cards ordered newest first', () => {
    vi.useFakeTimers({ now: 1000 })
    seedCard({ startVerse: 1, endVerse: 1, reference: 'John 3:1' })
    vi.advanceTimersByTime(1000)
    seedCard({ startVerse: 2, endVerse: 2, reference: 'John 3:2' })
    vi.advanceTimersByTime(1000)
    seedCard({ startVerse: 3, endVerse: 3, reference: 'John 3:3' })
    vi.useRealTimers()
    renderDeck()
    const references = screen.getAllByText(/John 3:\d/)
    expect(references[0]).toHaveTextContent('John 3:3')
    expect(references[1]).toHaveTextContent('John 3:2')
    expect(references[2]).toHaveTextContent('John 3:1')
  })

  it('re-renders when a card is added after mount', () => {
    renderDeck()
    expect(screen.getByText('Your memorization deck is ready')).toBeInTheDocument()

    act(() => {
      seedCard({
        book: 'psalms',
        bookName: 'Psalms',
        chapter: 23,
        startVerse: 1,
        endVerse: 1,
        verseText: 'The LORD is my shepherd...',
        reference: 'Psalm 23:1',
      })
    })

    expect(screen.getByText('1 card in your deck')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /flip card/i })).toBeInTheDocument()
  })

  it('re-renders when a card is removed after mount', () => {
    const card = seedCard()
    renderDeck()
    expect(screen.getByText('1 card in your deck')).toBeInTheDocument()

    act(() => {
      removeCard(card.id)
    })

    expect(screen.getByText('Your memorization deck is ready')).toBeInTheDocument()
  })
})
