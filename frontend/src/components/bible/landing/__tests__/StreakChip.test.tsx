import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StreakChip } from '../StreakChip'
import type { StreakRecord } from '@/types/bible-streak'

const DEFAULT_STREAK: StreakRecord = {
  currentStreak: 5,
  longestStreak: 5,
  lastReadDate: '2026-04-09',
  streakStartDate: '2026-04-05',
  graceDaysAvailable: 1,
  graceDaysUsedThisWeek: 0,
  lastGraceUsedDate: null,
  weekResetDate: '2026-04-06',
  milestones: [3],
  totalDaysRead: 5,
}

const noop = () => {}

describe('StreakChip', () => {
  it('hidden when currentStreak is 0', () => {
    const { container } = render(
      <StreakChip
        streak={{ ...DEFAULT_STREAK, currentStreak: 0 }}
        atRisk={false}
        pendingMilestone={null}
        onMilestoneDismissed={noop}
        onClick={noop}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders count and flame', () => {
    const { container } = render(
      <StreakChip
        streak={DEFAULT_STREAK}
        atRisk={false}
        pendingMilestone={null}
        onMilestoneDismissed={noop}
        onClick={noop}
      />,
    )
    expect(screen.getByText('5 day streak')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('flame color normal', () => {
    const { container } = render(
      <StreakChip
        streak={DEFAULT_STREAK}
        atRisk={false}
        pendingMilestone={null}
        onMilestoneDismissed={noop}
        onClick={noop}
      />,
    )
    const svg = container.querySelector('svg')
    expect(svg?.className.baseVal || svg?.getAttribute('class')).toContain('text-orange-400')
  })

  it('flame color at-risk', () => {
    const { container } = render(
      <StreakChip
        streak={DEFAULT_STREAK}
        atRisk={true}
        pendingMilestone={null}
        onMilestoneDismissed={noop}
        onClick={noop}
      />,
    )
    const svg = container.querySelector('svg')
    expect(svg?.className.baseVal || svg?.getAttribute('class')).toContain('text-warning')
  })

  it('has min-h-[44px]', () => {
    const { container } = render(
      <StreakChip
        streak={DEFAULT_STREAK}
        atRisk={false}
        pendingMilestone={null}
        onMilestoneDismissed={noop}
        onClick={noop}
      />,
    )
    const button = container.querySelector('button')
    expect(button?.className).toContain('min-h-[44px]')
  })

  it('click calls onClick', () => {
    const handleClick = vi.fn()
    render(
      <StreakChip
        streak={DEFAULT_STREAK}
        atRisk={false}
        pendingMilestone={null}
        onMilestoneDismissed={noop}
        onClick={handleClick}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('at-risk title attribute', () => {
    render(
      <StreakChip
        streak={DEFAULT_STREAK}
        atRisk={true}
        pendingMilestone={null}
        onMilestoneDismissed={noop}
        onClick={noop}
      />,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'Read today to keep your streak')
  })

  it('milestone pulse class', () => {
    const { container } = render(
      <StreakChip
        streak={DEFAULT_STREAK}
        atRisk={false}
        pendingMilestone={7}
        onMilestoneDismissed={noop}
        onClick={noop}
      />,
    )
    const button = container.querySelector('button')
    expect(button?.className).toContain('animate-pulse')
  })

  it('milestone pulse respects reduced motion', () => {
    const { container } = render(
      <StreakChip
        streak={DEFAULT_STREAK}
        atRisk={false}
        pendingMilestone={7}
        onMilestoneDismissed={noop}
        onClick={noop}
      />,
    )
    const button = container.querySelector('button')
    expect(button?.className).toContain('motion-reduce:animate-none')
  })
})
