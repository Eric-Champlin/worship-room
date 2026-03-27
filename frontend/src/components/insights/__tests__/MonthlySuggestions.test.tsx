import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MonthlySuggestions } from '../MonthlySuggestions'
import type { MonthSuggestion } from '@/hooks/useMonthlyReportSuggestions'

function renderSuggestions(suggestions: MonthSuggestion[]) {
  return render(
    <MemoryRouter>
      <MonthlySuggestions suggestions={suggestions} />
    </MemoryRouter>,
  )
}

describe('MonthlySuggestions', () => {
  it('renders nothing when no suggestions', () => {
    const { container } = renderSuggestions([])
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders suggestion cards with icons and CTAs', () => {
    const suggestions: MonthSuggestion[] = [
      {
        id: 'low-meditation',
        text: 'Try meditating more — even 2 minutes helps',
        icon: 'Brain',
        ctas: [{ text: 'Start a meditation >', link: '/daily?tab=meditate' }],
      },
      {
        id: 'low-journaling',
        text: 'Writing helps process emotions — try journaling this week',
        icon: 'PenLine',
        ctas: [{ text: 'Open journal >', link: '/daily?tab=journal' }],
      },
    ]
    renderSuggestions(suggestions)

    expect(screen.getByText('Suggestions for Next Month')).toBeInTheDocument()
    expect(screen.getByText('Try meditating more — even 2 minutes helps')).toBeInTheDocument()
    expect(screen.getByText('Start a meditation >')).toBeInTheDocument()
    expect(screen.getByText('Writing helps process emotions — try journaling this week')).toBeInTheDocument()
    expect(screen.getByText('Open journal >')).toBeInTheDocument()
  })

  it('mood decline card shows dual CTAs on separate lines', () => {
    const suggestions: MonthSuggestion[] = [
      {
        id: 'mood-decline',
        text: "This month was tough. You're not alone.",
        icon: 'Heart',
        ctas: [
          { text: 'Talk to God about it >', link: '/daily?tab=pray' },
          { text: 'Find a counselor >', link: '/local-support/counselors' },
        ],
      },
    ]
    renderSuggestions(suggestions)

    const links = screen.getAllByRole('link')
    const ctaLinks = links.filter(
      (l) =>
        l.getAttribute('href') === '/daily?tab=pray' ||
        l.getAttribute('href') === '/local-support/counselors',
    )
    expect(ctaLinks).toHaveLength(2)
  })

  it('mood improved card shows top activities and Keep it up', () => {
    const suggestions: MonthSuggestion[] = [
      {
        id: 'mood-improved',
        text: "Your mood improved this month! Here's what worked:",
        icon: 'TrendingUp',
        ctas: [],
        topActivities: [
          { name: 'Prayer', count: 15 },
          { name: 'Journaling', count: 8 },
        ],
      },
    ]
    renderSuggestions(suggestions)

    expect(screen.getByText(/Prayer \(15 times\)/)).toBeInTheDocument()
    expect(screen.getByText('Keep it up!')).toBeInTheDocument()
  })
})
