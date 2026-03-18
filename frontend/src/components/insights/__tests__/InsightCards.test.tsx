import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { InsightCards } from '../InsightCards'
import {
  AI_INSIGHT_CARDS,
  getDayOfYear,
  getInsightCardsForDay,
} from '@/constants/dashboard/ai-insights'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('InsightCards', () => {
  it('renders 4 insight cards with data', () => {
    const { container } = render(<InsightCards hasData={true} />)
    const grid = container.querySelector('.lg\\:grid-cols-2')
    const cards = grid?.querySelectorAll('.rounded-2xl')
    expect(cards?.length).toBe(4)
  })

  it('displays category labels from expected set', () => {
    render(<InsightCards hasData={true} />)
    const validLabels = ['Trend', 'Activity', 'Scripture', 'Recommendation']
    const day = getDayOfYear()
    const cards = getInsightCardsForDay(day, 4, 0)

    // All rendered labels should be from the valid set
    for (const card of cards) {
      expect(validLabels).toContain(card.categoryLabel)
    }

    // Each label that appears should render at least once
    const uniqueLabels = [...new Set(cards.map((c) => c.categoryLabel))]
    for (const label of uniqueLabels) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('rotation changes with different days', () => {
    const day0Cards = getInsightCardsForDay(0, 4, 0)
    const day1Cards = getInsightCardsForDay(1, 4, 0)

    const hasDifference = day0Cards.some(
      (card, i) => card.id !== day1Cards[i].id,
    )
    expect(hasDifference).toBe(true)
  })

  it('offset produces different cards than default', () => {
    const dayOfYear = 100
    const defaultCards = getInsightCardsForDay(dayOfYear, 4, 0)
    const offsetCards = getInsightCardsForDay(dayOfYear, 3, 5)

    // At least one card should differ
    const defaultIds = defaultCards.map((c) => c.id)
    const offsetIds = offsetCards.map((c) => c.id)
    const allSame = offsetIds.every((id) => defaultIds.includes(id))
    // With offset=5 and count=3 vs offset=0 and count=4, they should differ
    expect(allSame).toBe(false)
  })

  it('shows empty state when no entries', () => {
    render(<InsightCards hasData={false} />)
    expect(
      screen.getByText(/start checking in to see your insights grow/i),
    ).toBeInTheDocument()
  })

  it('disclaimer text present', () => {
    render(<InsightCards hasData={true} />)
    expect(
      screen.getByText(/insights are illustrative examples/i),
    ).toBeInTheDocument()
  })

  it('2-column grid on desktop class', () => {
    const { container } = render(<InsightCards hasData={true} />)
    const grid = container.querySelector('.lg\\:grid-cols-2')
    expect(grid).toBeInTheDocument()
  })

  it('all 11 cards have encouraging tone (no negative words)', () => {
    const negativeWords = [
      'bad',
      'failure',
      'terrible',
      'worst',
      'pathetic',
      'disgrace',
      'hopeless',
      'worthless',
    ]
    for (const card of AI_INSIGHT_CARDS) {
      const lower = card.text.toLowerCase()
      for (const word of negativeWords) {
        expect(lower).not.toContain(word)
      }
    }
  })

  it('AI_INSIGHT_CARDS has 11 cards', () => {
    expect(AI_INSIGHT_CARDS).toHaveLength(11)
  })
})
