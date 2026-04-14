import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import type { PlanMetadata, PlanProgress } from '@/types/bible-plans'

import { PlanInProgressCard } from '../PlanInProgressCard'

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
  currentDay: 3,
  completedDays: [1, 2],
  completedAt: null,
  pausedAt: null,
  resumeFromDay: null,
  reflection: null,
  celebrationShown: false,
}

function renderCard(
  plan: PlanMetadata = DEFAULT_PLAN,
  progress: PlanProgress = DEFAULT_PROGRESS,
) {
  return render(
    <MemoryRouter>
      <PlanInProgressCard plan={plan} progress={progress} />
    </MemoryRouter>,
  )
}

describe('PlanInProgressCard', () => {
  it('renders progress bar', () => {
    renderCard()
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '29') // 2/7 = 28.57 → 29%
  })

  it('renders current day text', () => {
    renderCard()
    expect(screen.getByText('Day 3 of 7')).toBeInTheDocument()
  })

  it('Continue button links to current day', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /Continue/i })
    expect(link).toHaveAttribute('href', '/bible/plans/finding-comfort/day/3')
  })

  it('shows paused label when paused', () => {
    renderCard(DEFAULT_PLAN, { ...DEFAULT_PROGRESS, pausedAt: '2026-01-05' })
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })
})
