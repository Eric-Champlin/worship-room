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

  it('applies new frosted glass styling (BB-52)', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link.className).toContain('bg-white/[0.03]')
    expect(link.className).toContain('backdrop-blur-sm')
    expect(link.className).toContain('border-white/[0.08]')
    expect(link.className).toContain('rounded-xl')
    expect(link.className).not.toContain('bg-gradient-to-br')
    expect(link.className).not.toContain('from-primary/30')
    expect(link.className).not.toContain('aspect-[4/3]')
  })

  it('renders brighter top-edge accent', () => {
    const { container } = renderCard()
    const accent = container.querySelector('.bg-white\\/20.h-px')
    expect(accent).not.toBeNull()
  })

  it('hover transition uses duration-base animation token', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link.className).toContain('duration-base')
    expect(link.className).toContain('ease-standard')
    expect(link.className).not.toContain('duration-300')
    expect(link.className).not.toContain('duration-200')
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
