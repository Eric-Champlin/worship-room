import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MonthlyInsightCards } from '../MonthlyInsightCards'
import { getDayOfYear, getInsightCardsForDay } from '@/constants/dashboard/ai-insights'

describe('MonthlyInsightCards', () => {
  it('renders 3 insight cards', () => {
    const { container } = render(<MonthlyInsightCards />)
    const grid = container.querySelector('.lg\\:grid-cols-2')
    const cards = grid?.querySelectorAll('.rounded-2xl')
    expect(cards?.length).toBe(3)
  })

  it('shows "Monthly Insights" heading', () => {
    render(<MonthlyInsightCards />)
    expect(screen.getByText('Monthly Insights')).toBeInTheDocument()
  })

  it('uses different offset than /insights page', () => {
    const day = getDayOfYear()
    const insightsCards = getInsightCardsForDay(day, 4, 0)
    const monthlyCards = getInsightCardsForDay(day, 3, 5)

    const insightsIds = insightsCards.map((c) => c.id)
    const monthlyIds = monthlyCards.map((c) => c.id)

    // The sets should not be identical (different offset + count)
    expect(monthlyIds).not.toEqual(insightsIds.slice(0, 3))
  })
})
