import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ActivePlanBanner } from '../ActivePlanBanner'

const DEFAULT_PROPS = {
  planSlug: 'psalm-comfort',
  planTitle: 'Psalms of Comfort',
  currentDay: 5,
  totalDays: 21,
  dayTitle: 'Day Five',
  primaryPassage: 'Psalm 23',
}

function renderBanner(props = DEFAULT_PROPS) {
  return render(
    <MemoryRouter>
      <ActivePlanBanner {...props} />
    </MemoryRouter>,
  )
}

describe('ActivePlanBanner', () => {
  it('renders plan title', () => {
    renderBanner()
    expect(screen.getByText('Psalms of Comfort')).toBeInTheDocument()
  })

  it('renders day progress', () => {
    renderBanner()
    expect(screen.getByText('Day 5 of 21')).toBeInTheDocument()
  })

  it('progress bar has correct aria', () => {
    renderBanner()
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '5')
    expect(bar).toHaveAttribute('aria-valuemax', '21')
  })

  it('"Continue" links to plan day page', () => {
    renderBanner()
    const link = screen.getByText("Continue today's reading")
    expect(link.closest('a')).toHaveAttribute('href', '/bible/plans/psalm-comfort/day/5')
  })

  it('"View plan" links to plan detail', () => {
    renderBanner()
    const link = screen.getByText('View plan')
    expect(link.closest('a')).toHaveAttribute('href', '/bible/plans/psalm-comfort')
  })
})
