import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UpcomingChallengeCard } from '../UpcomingChallengeCard'
import type { Challenge } from '@/types/challenges'

const TEST_CHALLENGE: Challenge = {
  id: 'fire-of-pentecost',
  title: 'Fire of Pentecost',
  description: 'A 21-day journey into the gifts and presence of the Holy Spirit.',
  season: 'pentecost',
  getStartDate: () => new Date(2026, 4, 24),
  durationDays: 21,
  icon: 'Flame',
  themeColor: '#DC2626',
  dailyContent: [],
  communityGoal: 'Pray together for spiritual renewal',
}

function renderCard(
  overrides?: Partial<React.ComponentProps<typeof UpcomingChallengeCard>>,
) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UpcomingChallengeCard
        challenge={TEST_CHALLENGE}
        startDate={new Date(2026, 4, 24)}
        isReminderSet={false}
        onToggleReminder={vi.fn()}
        onClick={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>,
  )
}

describe('UpcomingChallengeCard', () => {
  it('renders CategoryTag with Pentecost label', () => {
    renderCard()
    expect(screen.getByText('Pentecost')).toBeInTheDocument()
  })

  it('icon has text-white/90 class (not inherited category color)', () => {
    const { container } = renderCard()
    const icon = container.querySelector('svg.h-6')
    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('class')).toContain('text-white/90')
  })

  it('outer wrapper uses flex h-full flex-col for equal-height', () => {
    const { container } = renderCard()
    const article = container.querySelector('article')
    expect(article?.className).toContain('flex')
    expect(article?.className).toContain('h-full')
    expect(article?.className).toContain('flex-col')
  })

  it('uses canonical FrostedCard classes', () => {
    const { container } = renderCard()
    const article = container.querySelector('article')
    expect(article?.className).toContain('bg-white/[0.07]')
    expect(article?.className).toContain('border-white/[0.12]')
    expect(article?.className).toContain('backdrop-blur-sm')
    expect(article?.className).toContain('rounded-3xl')
  })

  it('Remind me button uses subtle pill variant', () => {
    renderCard({ isReminderSet: false })
    const btn = screen.getByRole('button', { name: /Set reminder/ })
    expect(btn.className).toContain('bg-white/[0.07]')
    expect(btn.className).toContain('border-white/[0.12]')
    expect(btn.className).toContain('text-white')
    expect(btn.className).toContain('rounded-full')
  })

  it('View Details renders as Link with correct href', () => {
    renderCard()
    const link = screen.getByRole('link', { name: 'View Details' })
    expect(link).toHaveAttribute('href', '/challenges/fire-of-pentecost')
    expect(link.className).toContain('bg-white/[0.07]')
    expect(link.className).toContain('rounded-full')
  })

  it('clicking Remind me fires onToggleReminder', () => {
    const onToggleReminder = vi.fn()
    renderCard({ onToggleReminder })
    fireEvent.click(screen.getByRole('button', { name: /Set reminder/ }))
    expect(onToggleReminder).toHaveBeenCalledTimes(1)
  })

  it('Reminder set state: aria-pressed true, Check icon', () => {
    renderCard({ isReminderSet: true })
    const btn = screen.getByRole('button', { name: 'Remove reminder' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Reminder set')).toBeInTheDocument()
  })

  it('Remind me state: aria-pressed false, Bell icon', () => {
    renderCard({ isReminderSet: false })
    const btn = screen.getByRole('button', { name: 'Set reminder' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Remind me')).toBeInTheDocument()
  })

  it('action row uses mt-auto for bottom pin', () => {
    renderCard()
    const link = screen.getByRole('link', { name: 'View Details' })
    const actionRow = link.parentElement
    expect(actionRow?.className).toContain('mt-auto')
    expect(actionRow?.className).toContain('flex-wrap')
  })

  it('formats start date in "Month Day" format', () => {
    renderCard({ startDate: new Date(2026, 4, 24) })
    expect(screen.getByText(/Starts May 24/)).toBeInTheDocument()
  })
})
