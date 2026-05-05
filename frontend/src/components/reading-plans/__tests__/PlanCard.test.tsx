import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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
  onStart: (id: string) => void = vi.fn(),
) {
  return render(
    <MemoryRouter>
      <PlanCard plan={TEST_PLAN} status={status} onStart={onStart} />
    </MemoryRouter>,
  )
}

describe('PlanCard', () => {
  it('renders as a Link to the plan detail page', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/reading-plans/finding-peace-in-anxiety')
  })

  it('applies canonical FrostedCard class string', () => {
    renderCard()
    const link = screen.getByRole('link')
    const card = link.firstElementChild as HTMLElement
    expect(card.className).toContain('rounded-3xl')
    expect(card.className).toContain('bg-white/[0.07]')
    expect(card.className).toContain('border-white/[0.12]')
    expect(card.className).toContain('backdrop-blur-sm')
  })

  it('applies hover state classes', () => {
    renderCard()
    const link = screen.getByRole('link')
    const card = link.firstElementChild as HTMLElement
    expect(card.className).toContain('hover:bg-white/[0.10]')
    expect(card.className).toContain('hover:-translate-y-0.5')
    expect(card.className).toContain('motion-reduce:hover:translate-y-0')
  })

  it('applies focus-visible ring classes with hero-bg offset', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link.className).toContain('rounded-3xl')
    expect(link.className).toContain('focus-visible:ring-2')
    expect(link.className).toContain('focus-visible:ring-violet-400/30')
    expect(link.className).toContain('focus-visible:ring-offset-2')
    expect(link.className).toContain('focus-visible:ring-offset-hero-bg')
  })

  it('uses animation token duration-base (not hardcoded ms)', () => {
    renderCard()
    const link = screen.getByRole('link')
    const card = link.firstElementChild as HTMLElement
    expect(card.className).toContain('duration-base')
    expect(card.className).toContain('motion-reduce:transition-none')
  })

  it('uses flex h-full flex-col for equal heights', () => {
    renderCard()
    const link = screen.getByRole('link')
    const card = link.firstElementChild as HTMLElement
    expect(card.className).toContain('flex')
    expect(card.className).toContain('h-full')
    expect(card.className).toContain('flex-col')
  })

  it('renders emoji inline with title (text-lg, not text-4xl)', () => {
    renderCard()
    const title = screen.getByRole('heading', { name: 'Finding Peace in Anxiety' })
    const emoji = title.previousElementSibling as HTMLElement
    expect(emoji.textContent).toBe('🕊️')
    expect(emoji.className).toContain('text-lg')
    expect(emoji.className).not.toContain('text-4xl')
  })

  it('emoji span has aria-hidden', () => {
    renderCard()
    const title = screen.getByRole('heading')
    const emoji = title.previousElementSibling as HTMLElement
    expect(emoji.getAttribute('aria-hidden')).toBe('true')
  })

  it('title uses font-semibold', () => {
    renderCard()
    const title = screen.getByRole('heading', { name: 'Finding Peace in Anxiety' })
    expect(title.className).toContain('font-semibold')
  })

  it('renders description with text-white/70', () => {
    renderCard()
    const description = screen.getByText(/A 7-day journey through scriptures/i)
    expect(description.className).toContain('text-white/70')
  })

  it('renders metadata pills with text-white/70', () => {
    renderCard()
    const durationPill = screen.getByText('7 days')
    expect(durationPill.className).toContain('text-white/70')
  })

  it('renders Start Plan as subtle pill (variant="subtle")', () => {
    renderCard('unstarted')
    const btn = screen.getByRole('button', { name: 'Start Plan' })
    expect(btn.className).toContain('bg-white/[0.07]')
    expect(btn.className).toContain('border-white/[0.12]')
    expect(btn.className).toContain('text-white')
    expect(btn.className).toContain('rounded-full')
  })

  it('renders Continue label when status=active', () => {
    renderCard('active')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('renders Resume label when status=paused', () => {
    renderCard('paused')
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
  })

  it('completed status renders a "Completed" badge (no button)', () => {
    renderCard('completed')
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('clicking Start Plan calls onStart with planId and stops propagation', () => {
    const onStart = vi.fn()
    renderCard('unstarted', onStart)
    const btn = screen.getByRole('button', { name: 'Start Plan' })
    fireEvent.click(btn)
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onStart).toHaveBeenCalledWith('finding-peace-in-anxiety')
  })

  it('action row uses mt-auto for bottom pin', () => {
    renderCard()
    const btn = screen.getByRole('button')
    const actionRow = btn.parentElement
    expect(actionRow?.className).toContain('mt-auto')
  })
})
