import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import type { PlanMetadata } from '@/types/bible-plans'

import { PlanBrowseCard } from '../PlanBrowseCard'

const DEFAULT_PLAN: PlanMetadata = {
  slug: 'finding-comfort',
  title: 'Finding Comfort',
  shortTitle: 'Comfort',
  description: 'A comforting plan',
  theme: 'comfort',
  duration: 7,
  estimatedMinutesPerDay: 10,
  curator: 'Worship Room',
  coverGradient: 'from-primary/30 to-hero-dark',
}

function renderCard(plan: PlanMetadata = DEFAULT_PLAN) {
  return render(
    <MemoryRouter>
      <PlanBrowseCard plan={plan} />
    </MemoryRouter>,
  )
}

describe('PlanBrowseCard', () => {
  it('renders title and shortTitle', () => {
    renderCard()
    expect(screen.getByText('Finding Comfort')).toBeInTheDocument()
    expect(screen.getByText('Comfort')).toBeInTheDocument()
  })

  it('renders duration and curator', () => {
    renderCard()
    expect(screen.getByText(/7 days/)).toBeInTheDocument()
    expect(screen.getByText(/10 min\/day/)).toBeInTheDocument()
    expect(screen.getByText(/By Worship Room/)).toBeInTheDocument()
  })

  it('links to plan detail', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/bible/plans/finding-comfort')
  })

  it('applies frosted glass styling (not colored gradient)', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link.className).toContain('bg-white/5')
    expect(link.className).toContain('backdrop-blur-sm')
    expect(link.className).toContain('border-white/10')
    expect(link.className).toContain('rounded-2xl')
    expect(link.className).not.toContain('bg-gradient-to-br')
    expect(link.className).not.toContain('from-primary/30')
  })

  it('does not render dark scrim', () => {
    const { container } = renderCard()
    expect(container.querySelector('.bg-gradient-to-t')).toBeNull()
  })

  it('has accessible article with aria-label', () => {
    renderCard()
    const article = screen.getByRole('article')
    expect(article).toHaveAttribute('aria-label', 'Finding Comfort')
  })
})
