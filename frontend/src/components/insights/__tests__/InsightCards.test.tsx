import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  InsightCards,
  getInsightsForDay,
  INSIGHT_VARIANTS,
} from '../InsightCards'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('InsightCards', () => {
  it('renders 4 insight cards with data', () => {
    const { container } = render(<InsightCards hasData={true} />)
    // 4 cards in the grid
    const grid = container.querySelector('.lg\\:grid-cols-2')
    const cards = grid?.querySelectorAll('.rounded-2xl')
    expect(cards?.length).toBe(4)
  })

  it('each card has icon, title, and text', () => {
    render(<InsightCards hasData={true} />)
    expect(screen.getByText('Trend Summary')).toBeInTheDocument()
    expect(screen.getByText('Activity Insight')).toBeInTheDocument()
    expect(screen.getByText('Scripture Connection')).toBeInTheDocument()
    expect(screen.getByText('Weekly Summary')).toBeInTheDocument()
  })

  it('rotation changes with different days', () => {
    const day1Insights = getInsightsForDay(0)
    const day2Insights = getInsightsForDay(1)

    // At least one insight should have different text for different days
    const hasDifference = day1Insights.some(
      (insight, i) => insight.text !== day2Insights[i].text,
    )
    expect(hasDifference).toBe(true)
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

  it('text tone is always encouraging', () => {
    const allTexts = Object.values(INSIGHT_VARIANTS)
      .flat()
      .map((v) => v.text)

    const negativeWords = ['bad', 'failure', 'terrible', 'worst', 'pathetic', 'disgrace']
    for (const text of allTexts) {
      const lower = text.toLowerCase()
      for (const word of negativeWords) {
        expect(lower).not.toContain(word)
      }
    }
  })
})
