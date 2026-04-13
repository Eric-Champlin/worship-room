import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MemorizationDeck } from '../MemorizationDeck'
import type { MemorizationCard } from '@/types/memorize'

vi.mock('@/hooks/bible/useMemorizationStore', () => ({
  useMemorizationStore: vi.fn(),
}))

vi.mock('@/lib/memorize', () => ({
  removeCard: vi.fn(),
  recordReview: vi.fn(),
}))

import { useMemorizationStore } from '@/hooks/bible/useMemorizationStore'
const mockedUseStore = vi.mocked(useMemorizationStore)

function makeCard(overrides?: Partial<MemorizationCard>): MemorizationCard {
  return {
    id: 'card-1',
    book: 'john',
    bookName: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    verseText: 'For God so loved the world...',
    reference: 'John 3:16',
    createdAt: Date.now(),
    lastReviewedAt: null,
    reviewCount: 0,
    ...overrides,
  }
}

const renderDeck = () =>
  render(
    <MemoryRouter>
      <MemorizationDeck />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MemorizationDeck', () => {
  it('renders empty state when no cards', () => {
    mockedUseStore.mockReturnValue([])
    renderDeck()
    expect(screen.getByText('Your memorization deck is ready')).toBeInTheDocument()
  })

  it('renders card count in summary', () => {
    mockedUseStore.mockReturnValue([
      makeCard({ id: '1', startVerse: 1, endVerse: 1 }),
      makeCard({ id: '2', startVerse: 2, endVerse: 2 }),
      makeCard({ id: '3', startVerse: 3, endVerse: 3 }),
    ])
    renderDeck()
    expect(screen.getByText('3 cards in your deck')).toBeInTheDocument()
  })

  it('renders singular "card" for 1 card', () => {
    mockedUseStore.mockReturnValue([makeCard()])
    renderDeck()
    expect(screen.getByText('1 card in your deck')).toBeInTheDocument()
  })

  it('renders last reviewed line when applicable', () => {
    mockedUseStore.mockReturnValue([
      makeCard({ lastReviewedAt: Date.now() - 1000 * 60 * 5, reviewCount: 1 }),
    ])
    renderDeck()
    expect(screen.getByText(/Last reviewed John 3:16/)).toBeInTheDocument()
  })

  it('hides last reviewed line when no reviews', () => {
    mockedUseStore.mockReturnValue([makeCard()])
    renderDeck()
    expect(screen.queryByText(/Last reviewed/)).not.toBeInTheDocument()
  })

  it('renders correct number of flip cards', () => {
    mockedUseStore.mockReturnValue([
      makeCard({ id: '1', startVerse: 1, endVerse: 1, reference: 'John 3:1' }),
      makeCard({ id: '2', startVerse: 2, endVerse: 2, reference: 'John 3:2' }),
      makeCard({ id: '3', startVerse: 3, endVerse: 3, reference: 'John 3:3' }),
      makeCard({ id: '4', startVerse: 4, endVerse: 4, reference: 'John 3:4' }),
      makeCard({ id: '5', startVerse: 5, endVerse: 5, reference: 'John 3:5' }),
    ])
    renderDeck()
    const flipButtons = screen.getAllByRole('button', { name: /flip card/i })
    expect(flipButtons).toHaveLength(5)
  })

  it('section heading says "Memorization deck"', () => {
    mockedUseStore.mockReturnValue([makeCard()])
    renderDeck()
    expect(screen.getByRole('heading', { name: 'Memorization deck' })).toBeInTheDocument()
  })

  it('responsive grid classes applied', () => {
    mockedUseStore.mockReturnValue([makeCard()])
    renderDeck()
    const grid = screen.getByRole('button', { name: /flip card/i }).closest('.grid')
    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).toHaveClass('sm:grid-cols-2')
    expect(grid).toHaveClass('lg:grid-cols-3')
  })

  it('cards ordered newest first', () => {
    const cards = [
      makeCard({ id: '3', startVerse: 3, endVerse: 3, reference: 'John 3:3', createdAt: 3000 }),
      makeCard({ id: '2', startVerse: 2, endVerse: 2, reference: 'John 3:2', createdAt: 2000 }),
      makeCard({ id: '1', startVerse: 1, endVerse: 1, reference: 'John 3:1', createdAt: 1000 }),
    ]
    mockedUseStore.mockReturnValue(cards)
    renderDeck()
    const references = screen.getAllByText(/John 3:\d/)
    expect(references[0]).toHaveTextContent('John 3:3')
    expect(references[1]).toHaveTextContent('John 3:2')
    expect(references[2]).toHaveTextContent('John 3:1')
  })
})
