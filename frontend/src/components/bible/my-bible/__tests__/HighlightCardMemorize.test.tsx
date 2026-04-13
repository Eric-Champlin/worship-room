import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HighlightCard } from '../HighlightCard'

vi.mock('@/hooks/bible/useMemorizationStore', () => ({
  useMemorizationStore: vi.fn(() => []),
}))

vi.mock('@/lib/memorize', () => ({
  isCardForVerse: vi.fn(),
  addCard: vi.fn(),
  getCardForVerse: vi.fn(),
  removeCard: vi.fn(),
}))

import { isCardForVerse, addCard, getCardForVerse, removeCard } from '@/lib/memorize'
const mockedIsCard = vi.mocked(isCardForVerse)
const mockedAddCard = vi.mocked(addCard)
const mockedGetCard = vi.mocked(getCardForVerse)
const mockedRemoveCard = vi.mocked(removeCard)

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
  vi.clearAllMocks()
  mockedIsCard.mockReturnValue(false)
  mockedGetCard.mockReturnValue(undefined)
})

describe('HighlightCard memorize affordance', () => {
  it('renders Layers icon when verse not in deck', () => {
    render(<HighlightCard {...baseProps} />)
    expect(screen.getByLabelText('Add to memorization deck')).toBeInTheDocument()
  })

  it('renders "In deck" label when verse in deck', () => {
    mockedIsCard.mockReturnValue(true)
    render(<HighlightCard {...baseProps} />)
    expect(screen.getByText('In deck')).toBeInTheDocument()
  })

  it('clicking icon adds verse to deck', () => {
    render(<HighlightCard {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Add to memorization deck'))
    expect(mockedAddCard).toHaveBeenCalledWith(
      expect.objectContaining({
        book: 'john',
        bookName: 'John',
        chapter: 3,
        startVerse: 16,
        endVerse: 16,
        verseText: 'For God so loved the world...',
        reference: 'John 3:16',
      }),
    )
  })

  it('clicking "In deck" removes from deck', () => {
    mockedIsCard.mockReturnValue(true)
    mockedGetCard.mockReturnValue({
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
    })
    render(<HighlightCard {...baseProps} />)
    fireEvent.click(screen.getByLabelText('In memorization deck'))
    expect(mockedRemoveCard).toHaveBeenCalledWith('card-1')
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
