import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NextChallengeCountdown } from '../NextChallengeCountdown'
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

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function renderCountdown(
  overrides?: Partial<React.ComponentProps<typeof NextChallengeCountdown>>,
) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NextChallengeCountdown
        challenge={TEST_CHALLENGE}
        startDate={daysFromNow(37)}
        isReminderSet={false}
        onToggleReminder={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>,
  )
}

describe('NextChallengeCountdown', () => {
  it('renders CategoryTag in title row', () => {
    renderCountdown()
    expect(screen.getByText('Pentecost')).toBeInTheDocument()
  })

  it('icon uses text-white/90 class', () => {
    const { container } = renderCountdown()
    const icon = container.querySelector('svg.h-7')
    expect(icon?.getAttribute('class')).toContain('text-white/90')
  })

  it('uses canonical FrostedCard class string', () => {
    const { container } = renderCountdown()
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('bg-white/[0.06]')
    expect(outer.className).toContain('border-white/[0.12]')
    expect(outer.className).toContain('backdrop-blur-sm')
    expect(outer.className).toContain('shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]')
  })

  it('countdown color is text-white when days > 7', () => {
    renderCountdown({ startDate: daysFromNow(37) })
    const countdownSpan = screen.getByText((_, node) =>
      node?.tagName === 'SPAN' && node.textContent === '37 days',
    )
    expect(countdownSpan.className).toContain('text-white')
    expect(countdownSpan.className).not.toContain('text-red-400')
    expect(countdownSpan.className).not.toContain('text-amber-300')
  })

  it('countdown color is text-amber-300 when days <= 7', () => {
    renderCountdown({ startDate: daysFromNow(5) })
    const countdownSpan = screen.getByText((_, node) =>
      node?.tagName === 'SPAN' && node.textContent === '5 days',
    )
    expect(countdownSpan.className).toContain('text-amber-300')
  })

  it('countdown color is text-red-400 when days <= 1', () => {
    renderCountdown({ startDate: daysFromNow(1) })
    const countdownSpan = screen.getByText((_, node) =>
      node?.tagName === 'SPAN' && node.textContent === '1 day',
    )
    expect(countdownSpan.className).toContain('text-red-400')
  })

  it('pluralizes singular: "1 day" (not "1 days")', () => {
    renderCountdown({ startDate: daysFromNow(1) })
    expect(
      screen.getByText((_, node) => node?.tagName === 'SPAN' && node.textContent === '1 day'),
    ).toBeInTheDocument()
  })

  it('pluralizes multi: "5 days"', () => {
    renderCountdown({ startDate: daysFromNow(5) })
    expect(
      screen.getByText((_, node) => node?.tagName === 'SPAN' && node.textContent === '5 days'),
    ).toBeInTheDocument()
  })

  it('renders View Details Link', () => {
    renderCountdown()
    const link = screen.getByRole('link', { name: 'View Details' })
    expect(link).toHaveAttribute('href', '/challenges/fire-of-pentecost')
    expect(link.className).toContain('bg-white')
    expect(link.className).toContain('rounded-full')
  })

  it('Remind me button uses white pill variant', () => {
    renderCountdown({ isReminderSet: false })
    const btn = screen.getByRole('button', { name: 'Set reminder' })
    expect(btn.className).toContain('bg-white')
    expect(btn.className).toContain('rounded-full')
  })

  it('clicking Remind me fires onToggleReminder', () => {
    const onToggleReminder = vi.fn()
    renderCountdown({ onToggleReminder })
    fireEvent.click(screen.getByRole('button', { name: /Set reminder/ }))
    expect(onToggleReminder).toHaveBeenCalledTimes(1)
  })

  it('Remind me has aria-pressed attribute', () => {
    renderCountdown({ isReminderSet: true })
    const btn = screen.getByRole('button', { name: 'Remove reminder' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('Next Challenge header renders', () => {
    renderCountdown()
    expect(screen.getByText('Next Challenge')).toBeInTheDocument()
  })

  it('does not use getContrastSafeColor (no inline color style on countdown)', () => {
    renderCountdown({ startDate: daysFromNow(37) })
    const countdownSpan = screen.getByText((_, node) =>
      node?.tagName === 'SPAN' && node.textContent === '37 days',
    )
    // Inline `style` color attribute is removed in favor of Tailwind class
    expect(countdownSpan.getAttribute('style')).toBe(null)
  })
})
