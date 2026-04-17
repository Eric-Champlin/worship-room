import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlanCard } from '../PlanCard'
import type { ReadingPlanMeta } from '@/types/reading-plans'

const TEST_PLAN: ReadingPlanMeta = {
  id: 'finding-peace-in-anxiety',
  title: 'Finding Peace in Anxiety',
  description: 'A 7-day journey through scriptures about peace in the midst of anxious thoughts.',
  durationDays: 7,
  difficulty: 'beginner',
  theme: 'anxiety',
  coverEmoji: '🕊️',
}

function renderCard(
  status: 'unstarted' | 'active' | 'paused' | 'completed' = 'unstarted',
) {
  return render(
    <MemoryRouter>
      <PlanCard plan={TEST_PLAN} status={status} onStart={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('PlanCard', () => {
  it('renders as a Link to the plan detail page', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'href',
      '/reading-plans/finding-peace-in-anxiety',
    )
  })

  it('applies FrostedCard-pattern classes to the link container', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link.className).toContain('rounded-2xl')
    expect(link.className).toContain('bg-white/5')
    expect(link.className).toContain('border-white/10')
    expect(link.className).toContain('backdrop-blur-sm')
  })

  it('applies hover state classes', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link.className).toContain('hover:bg-white/[0.08]')
    expect(link.className).toContain('hover:border-white/20')
  })

  it('applies focus-visible ring classes', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link.className).toContain('focus-visible:ring-2')
    expect(link.className).toContain('focus-visible:ring-white/50')
    expect(link.className).toContain('focus-visible:ring-offset-2')
    expect(link.className).toContain(
      'focus-visible:ring-offset-dashboard-dark',
    )
  })

  it('uses animation token duration-base (not hardcoded ms)', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link.className).toContain('duration-base')
    expect(link.className).toContain('motion-reduce:transition-none')
  })

  it('renders title with font-semibold (not font-bold)', () => {
    renderCard()
    const title = screen.getByRole('heading', {
      name: 'Finding Peace in Anxiety',
    })
    expect(title.className).toContain('font-semibold')
    expect(title.className).not.toContain('font-bold')
  })

  it('renders description with text-white/70', () => {
    renderCard()
    const description = screen.getByText(/A 7-day journey through scriptures/i)
    expect(description.className).toContain('text-white/70')
  })

  it('renders metadata pills with text-white/70 (not text-white/50)', () => {
    renderCard()
    const durationPill = screen.getByText('7 days')
    expect(durationPill.className).toContain('text-white/70')
    expect(durationPill.className).not.toContain('text-white/50')
  })
})
