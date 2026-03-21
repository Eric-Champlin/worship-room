import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DayCompletionCelebration } from '../DayCompletionCelebration'

beforeEach(() => {
  vi.restoreAllMocks()
})

function renderCelebration(overrides: Partial<{
  dayNumber: number
  pointsAwarded: boolean
  isLastDay: boolean
  onContinue: () => void
}> = {}) {
  return render(
    <DayCompletionCelebration
      dayNumber={overrides.dayNumber ?? 3}
      pointsAwarded={overrides.pointsAwarded ?? true}
      isLastDay={overrides.isLastDay ?? false}
      onContinue={overrides.onContinue ?? vi.fn()}
    />,
  )
}

describe('DayCompletionCelebration', () => {
  it('renders checkmark and day number', () => {
    renderCelebration({ dayNumber: 3 })
    expect(screen.getByText('Day 3 Complete')).toBeInTheDocument()
    // SVG checkmark
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('shows +15 pts when pointsAwarded is true', () => {
    renderCelebration({ pointsAwarded: true })
    expect(screen.getByText('+15 pts')).toBeInTheDocument()
  })

  it('hides +15 pts when pointsAwarded is false', () => {
    renderCelebration({ pointsAwarded: false })
    expect(screen.queryByText('+15 pts')).not.toBeInTheDocument()
  })

  it('shows Continue button for non-last day', () => {
    renderCelebration({ dayNumber: 3, isLastDay: false })
    expect(screen.getByText('Continue to Day 4')).toBeInTheDocument()
  })

  it('hides Continue button for last day', () => {
    renderCelebration({ dayNumber: 7, isLastDay: true })
    expect(screen.queryByText(/Continue to Day/)).not.toBeInTheDocument()
  })

  it('calls onContinue when Continue button is clicked', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    renderCelebration({ isLastDay: false, onContinue })
    await user.click(screen.getByText('Continue to Day 4'))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('respects prefers-reduced-motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
    } as MediaQueryList)

    renderCelebration()
    // With reduced motion, the checkmark path should have strokeDashoffset of 0 immediately
    const path = document.querySelector('path')
    expect(path).toHaveAttribute('stroke-dashoffset', '0')
    // No transition style on the path
    expect(path?.style.transition).toBeFalsy()
  })
})
