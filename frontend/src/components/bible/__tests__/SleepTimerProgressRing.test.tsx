import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SleepTimerProgressRing } from '../SleepTimerProgressRing'

describe('SleepTimerProgressRing', () => {
  it('renders correct SVG with track and progress circles', () => {
    render(
      <SleepTimerProgressRing
        remainingMs={15 * 60 * 1000}
        totalDurationMs={30 * 60 * 1000}
        onClick={vi.fn()}
      />,
    )

    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')

    const circles = document.querySelectorAll('circle')
    expect(circles).toHaveLength(2)
  })

  it('shows correct remaining time in aria-label', () => {
    render(
      <SleepTimerProgressRing
        remainingMs={15 * 60 * 1000}
        totalDurationMs={30 * 60 * 1000}
        onClick={vi.fn()}
      />,
    )

    expect(
      screen.getByLabelText('Sleep timer: 15 minutes remaining'),
    ).toBeInTheDocument()
  })

  it('aria-label handles singular minute', () => {
    render(
      <SleepTimerProgressRing
        remainingMs={60 * 1000}
        totalDurationMs={30 * 60 * 1000}
        onClick={vi.fn()}
      />,
    )

    expect(
      screen.getByLabelText('Sleep timer: 1 minute remaining'),
    ).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <SleepTimerProgressRing
        remainingMs={15 * 60 * 1000}
        totalDurationMs={30 * 60 * 1000}
        onClick={onClick}
      />,
    )

    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('progress circle has correct stroke-dashoffset for 50%', () => {
    render(
      <SleepTimerProgressRing
        remainingMs={15 * 60 * 1000}
        totalDurationMs={30 * 60 * 1000}
        onClick={vi.fn()}
      />,
    )

    const circles = document.querySelectorAll('circle')
    const progressCircle = circles[1]
    const r = 10
    const circumference = 2 * Math.PI * r
    // 50% remaining → dashOffset = circumference * 0.5
    const expectedOffset = circumference * 0.5
    expect(Number(progressCircle.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      expectedOffset,
      0,
    )
  })

  it('has 44px touch target', () => {
    render(
      <SleepTimerProgressRing
        remainingMs={15 * 60 * 1000}
        totalDurationMs={30 * 60 * 1000}
        onClick={vi.fn()}
      />,
    )

    const button = screen.getByRole('button')
    expect(button.className).toContain('min-h-[44px]')
    expect(button.className).toContain('min-w-[44px]')
  })
})
