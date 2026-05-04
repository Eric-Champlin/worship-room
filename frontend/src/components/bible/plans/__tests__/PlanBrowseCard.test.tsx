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

  it('uses FrostedCard chrome (Spec 3 migration)', () => {
    const { container } = renderCard()
    // Inner FrostedCard div lives inside the Link
    const link = screen.getByRole('link')
    const frostedDiv = link.firstElementChild as HTMLElement
    expect(frostedDiv.className).toContain('rounded-3xl')
    expect(frostedDiv.className).toContain('border-white/[0.12]')
    expect(frostedDiv.className).toContain('shadow-frosted-base')
    expect(frostedDiv.className).toContain('min-h-[140px]')
    // Old rolls-own chrome should be gone
    expect(link.className).not.toContain('bg-white/[0.03]')
    expect(link.className).not.toContain('rounded-xl')
    expect(container.querySelector('.bg-white\\/20.h-px')).toBeNull() // top-edge accent removed
  })

  it('outer Link uses group + focus ring for hover-lift propagation', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link.className).toContain('group')
    expect(link.className).toContain('focus-visible:ring-2')
  })

  it('FrostedCard hover lift is gated by group-hover', () => {
    renderCard()
    const link = screen.getByRole('link')
    const frostedDiv = link.firstElementChild as HTMLElement
    expect(frostedDiv.className).toContain('group-hover:bg-white/[0.10]')
    expect(frostedDiv.className).toContain('group-hover:-translate-y-0.5')
    expect(frostedDiv.className).toContain('duration-base')
    expect(frostedDiv.className).toContain('ease-decelerate')
  })

  it('title uses text-white, subtitle text-white/70, meta text-white/50', () => {
    renderCard()
    const title = screen.getByText('Finding Comfort')
    expect(title.className).toContain('text-white')
    const subtitle = screen.getByText('Comfort')
    expect(subtitle.className).toContain('text-white/70')
    const meta = screen.getByText(/7 days/)
    expect(meta.className).toContain('text-white/50')
  })

  it('has accessible article with aria-label', () => {
    renderCard()
    const article = screen.getByRole('article')
    expect(article).toHaveAttribute('aria-label', 'Finding Comfort')
  })

  // Slug → icon + color mapping
  it('Psalms 30 days uses BookOpen icon with blue-400', () => {
    const plan = { ...DEFAULT_PLAN, slug: 'psalms-30-days', title: 'Psalms in 30 Days' }
    const { container } = renderCard(plan)
    const icon = container.querySelector('svg.text-blue-400')
    expect(icon).not.toBeNull()
  })

  it('John plan uses Star icon with amber-400', () => {
    const plan = { ...DEFAULT_PLAN, slug: 'john-story-of-jesus', title: 'John: Story of Jesus' }
    const { container } = renderCard(plan)
    const icon = container.querySelector('svg.text-amber-400')
    expect(icon).not.toBeNull()
  })

  it('When Anxious uses Heart icon with teal-400', () => {
    const plan = { ...DEFAULT_PLAN, slug: 'when-youre-anxious', title: "When You're Anxious" }
    const { container } = renderCard(plan)
    const icon = container.querySelector('svg.text-teal-400')
    expect(icon).not.toBeNull()
  })

  it('Sleep plan uses Moon icon with indigo-400', () => {
    const plan = { ...DEFAULT_PLAN, slug: 'when-you-cant-sleep', title: "When You Can't Sleep" }
    const { container } = renderCard(plan)
    const icon = container.querySelector('svg.text-indigo-400')
    expect(icon).not.toBeNull()
  })

  it('unknown slug falls back to default (BookOpen, text-white/70)', () => {
    const plan = { ...DEFAULT_PLAN, slug: 'unknown-plan-slug' }
    const { container } = renderCard(plan)
    const defaultIcon = container.querySelector('svg.text-white\\/70')
    expect(defaultIcon).not.toBeNull()
    // Ensure NO specific color class applied
    expect(container.querySelector('svg.text-blue-400')).toBeNull()
    expect(container.querySelector('svg.text-amber-400')).toBeNull()
  })
})
