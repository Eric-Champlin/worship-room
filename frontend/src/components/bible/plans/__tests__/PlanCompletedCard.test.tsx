import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import type { PlanMetadata, PlanProgress } from '@/types/bible-plans'

import { PlanCompletedCard } from '../PlanCompletedCard'

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

const DEFAULT_PROGRESS: PlanProgress = {
  slug: 'finding-comfort',
  startedAt: '2026-01-01',
  currentDay: 7,
  completedDays: [1, 2, 3, 4, 5, 6, 7],
  completedAt: '2026-01-07',
  pausedAt: null,
  resumeFromDay: null,
  reflection: null,
  celebrationShown: true,
}

function renderCard(
  plan: PlanMetadata = DEFAULT_PLAN,
  progress: PlanProgress = DEFAULT_PROGRESS,
) {
  return render(
    <MemoryRouter>
      <PlanCompletedCard plan={plan} progress={progress} />
    </MemoryRouter>,
  )
}

describe('PlanCompletedCard', () => {
  it('renders completed badge', () => {
    renderCard()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders at reduced opacity', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link.className).toContain('opacity-85')
  })

  it('renders completion date', () => {
    renderCard()
    // Date format is locale-dependent; check for key parts
    expect(screen.getByText(/Finished/)).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })

  it('links to plan detail', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/bible/plans/finding-comfort')
  })
})
