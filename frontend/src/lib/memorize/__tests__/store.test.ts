import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MEMORIZATION_CARDS_KEY } from '@/constants/bible'
import {
  addCard,
  removeCard,
  recordReview,
  getAllCards,
  isCardForVerse,
  getCardForVerse,
  subscribe,
  _resetForTesting,
} from '../store'

const baseParams = {
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verseText: 'For God so loved the world...',
  reference: 'John 3:16',
}

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
})

describe('addCard', () => {
  it('creates card with correct fields', () => {
    const card = addCard(baseParams)

    expect(card.id).toBeTruthy()
    expect(card.book).toBe('john')
    expect(card.bookName).toBe('John')
    expect(card.chapter).toBe(3)
    expect(card.startVerse).toBe(16)
    expect(card.endVerse).toBe(16)
    expect(card.verseText).toBe('For God so loved the world...')
    expect(card.reference).toBe('John 3:16')
    expect(card.createdAt).toBeGreaterThan(0)
    expect(card.lastReviewedAt).toBeNull()
    expect(card.reviewCount).toBe(0)
  })

  it('deduplicates exact range', () => {
    const card1 = addCard(baseParams)
    const card2 = addCard(baseParams)

    expect(card1.id).toBe(card2.id)
    expect(getAllCards()).toHaveLength(1)
  })
})

describe('getAllCards', () => {
  it('returns newest first', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const card1 = addCard({ ...baseParams, startVerse: 1, endVerse: 1, reference: 'John 3:1' })
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'))
    const card2 = addCard({ ...baseParams, startVerse: 2, endVerse: 2, reference: 'John 3:2' })
    vi.setSystemTime(new Date('2026-01-03T00:00:00Z'))
    const card3 = addCard({ ...baseParams, startVerse: 3, endVerse: 3, reference: 'John 3:3' })

    const cards = getAllCards()
    expect(cards).toHaveLength(3)
    expect(cards[0].id).toBe(card3.id)
    expect(cards[1].id).toBe(card2.id)
    expect(cards[2].id).toBe(card1.id)
    vi.useRealTimers()
  })
})

describe('removeCard', () => {
  it('deletes by id', () => {
    const card1 = addCard(baseParams)
    const card2 = addCard({ ...baseParams, startVerse: 17, endVerse: 17, reference: 'John 3:17' })

    removeCard(card1.id)

    const remaining = getAllCards()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(card2.id)
  })

  it('no-ops for unknown id', () => {
    addCard(baseParams)
    removeCard('nonexistent-id')
    expect(getAllCards()).toHaveLength(1)
  })
})

describe('recordReview', () => {
  it('increments count', () => {
    const card = addCard(baseParams)
    recordReview(card.id)

    const updated = getAllCards()[0]
    expect(updated.reviewCount).toBe(1)
    expect(updated.lastReviewedAt).not.toBeNull()
  })

  it('updates lastReviewedAt', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const card = addCard(baseParams)
    recordReview(card.id)
    const firstReview = getAllCards()[0].lastReviewedAt!

    vi.setSystemTime(new Date('2026-01-01T01:00:00Z'))
    recordReview(card.id)
    const secondReview = getAllCards()[0].lastReviewedAt!

    expect(secondReview).toBeGreaterThan(firstReview)
    expect(getAllCards()[0].reviewCount).toBe(2)
    vi.useRealTimers()
  })
})

describe('isCardForVerse', () => {
  it('returns true for exact match', () => {
    addCard(baseParams)
    expect(isCardForVerse('john', 3, 16, 16)).toBe(true)
  })

  it('returns false for different verse', () => {
    addCard(baseParams)
    expect(isCardForVerse('john', 3, 17, 17)).toBe(false)
  })

  it('handles single-verse default endVerse', () => {
    addCard(baseParams)
    expect(isCardForVerse('john', 3, 16)).toBe(true)
  })
})

describe('getCardForVerse', () => {
  it('returns the card', () => {
    const card = addCard(baseParams)
    const found = getCardForVerse('john', 3, 16, 16)
    expect(found?.id).toBe(card.id)
  })

  it('returns undefined for no match', () => {
    expect(getCardForVerse('john', 3, 16)).toBeUndefined()
  })
})

describe('subscribe', () => {
  it('notifies on addCard', () => {
    const listener = vi.fn()
    subscribe(listener)
    addCard(baseParams)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notifies on removeCard', () => {
    const card = addCard(baseParams)
    const listener = vi.fn()
    subscribe(listener)
    removeCard(card.id)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notifies on recordReview', () => {
    const card = addCard(baseParams)
    const listener = vi.fn()
    subscribe(listener)
    recordReview(card.id)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('stops notifications after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)
    unsubscribe()
    addCard(baseParams)
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('persistence', () => {
  it('persists to localStorage', () => {
    addCard(baseParams)
    _resetForTesting() // clear in-memory cache

    const cards = getAllCards()
    expect(cards).toHaveLength(1)
    expect(cards[0].book).toBe('john')
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(MEMORIZATION_CARDS_KEY, '{not valid json')
    _resetForTesting()

    expect(getAllCards()).toEqual([])
  })
})

describe('_resetForTesting', () => {
  it('clears state', () => {
    addCard(baseParams)
    const listener = vi.fn()
    subscribe(listener)

    _resetForTesting()
    localStorage.clear()

    expect(getAllCards()).toEqual([])
    addCard(baseParams) // should NOT notify old listener
    expect(listener).not.toHaveBeenCalled()
  })
})
