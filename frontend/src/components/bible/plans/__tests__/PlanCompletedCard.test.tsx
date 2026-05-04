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

  it('renders at reduced opacity (on inner FrostedCard)', () => {
    renderCard()
    const link = screen.getByRole('link')
    const frostedDiv = link.firstElementChild as HTMLElement
    expect(frostedDiv.className).toContain('opacity-85')
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

  it('uses FrostedCard chrome (Spec 3 migration)', () => {
    const { container } = renderCard()
    const link = screen.getByRole('link')
    const frostedDiv = link.firstElementChild as HTMLElement
    expect(frostedDiv.className).toContain('rounded-3xl')
    expect(frostedDiv.className).toContain('border-white/[0.12]')
    expect(frostedDiv.className).toContain('shadow-frosted-base')
    expect(frostedDiv.className).toContain('min-h-[140px]')
    expect(frostedDiv.className).toContain('relative') // required for absolute Completed badge
    // Old rolls-own chrome should be gone
    expect(link.className).not.toContain('bg-white/[0.03]')
    expect(link.className).not.toContain('rounded-xl')
    expect(container.querySelector('.bg-white\\/20.h-px')).toBeNull() // top-edge accent removed
  })

  it('FrostedCard hover lift via group-hover; opacity-85 + group-hover both on inner card', () => {
    renderCard()
    const link = screen.getByRole('link')
    const frostedDiv = link.firstElementChild as HTMLElement
    expect(frostedDiv.className).toContain('group-hover:bg-white/[0.10]')
    expect(frostedDiv.className).toContain('group-hover:-translate-y-0.5')
    expect(frostedDiv.className).toContain('opacity-85')
  })

  it('does not render dark scrim', () => {
    const { container } = renderCard()
    expect(container.querySelector('.bg-gradient-to-t')).toBeNull()
  })
})
