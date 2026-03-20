import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { WeeklyGodMoments } from '../WeeklyGodMoments'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

import { useReducedMotion } from '@/hooks/useReducedMotion'

const defaultProps = {
  isVisible: true,
  devotionalsRead: 3,
  totalActivities: 12,
  moodTrend: 'steady' as const,
  dismiss: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('WeeklyGodMoments', () => {
  it('renders "Your Week with God" heading', () => {
    render(<WeeklyGodMoments {...defaultProps} />)
    expect(screen.getByText('Your Week with God')).toBeInTheDocument()
  })

  it('renders 3 stats', () => {
    render(<WeeklyGodMoments {...defaultProps} />)
    expect(screen.getByText('3 of 7')).toBeInTheDocument()
    expect(screen.getByText('devotionals')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('activities this week')).toBeInTheDocument()
    expect(screen.getByText('Steady')).toBeInTheDocument()
    expect(screen.getByText('mood trend')).toBeInTheDocument()
  })

  it('7/7 devotionals uses success green', () => {
    render(<WeeklyGodMoments {...defaultProps} devotionalsRead={7} />)
    const stat = screen.getByText('7 of 7')
    expect(stat.className).toContain('text-success')
  })

  it('"Needs grace" shows Heart icon', () => {
    render(<WeeklyGodMoments {...defaultProps} moodTrend="needs-grace" />)
    expect(screen.getByText('Needs grace')).toBeInTheDocument()
    const trendLabel = screen.getByText('Needs grace')
    expect(trendLabel.className).toContain('text-amber-400')
  })

  it('"Keep checking in" shown for insufficient data', () => {
    render(<WeeklyGodMoments {...defaultProps} moodTrend="insufficient" />)
    expect(screen.getByText('Keep checking in')).toBeInTheDocument()
  })

  it('dismiss button has aria-label', () => {
    render(<WeeklyGodMoments {...defaultProps} />)
    expect(screen.getByLabelText('Dismiss weekly summary')).toBeInTheDocument()
  })

  it('dismiss button hides banner', () => {
    const dismiss = vi.fn()
    render(<WeeklyGodMoments {...defaultProps} dismiss={dismiss} />)
    fireEvent.click(screen.getByLabelText('Dismiss weekly summary'))
    // Wait for fade animation
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(dismiss).toHaveBeenCalledOnce()
  })

  it('dismiss button meets 44px touch target', () => {
    render(<WeeklyGodMoments {...defaultProps} />)
    const button = screen.getByLabelText('Dismiss weekly summary')
    expect(button.className).toContain('min-h-[44px]')
    expect(button.className).toContain('min-w-[44px]')
  })

  it('region has aria-label', () => {
    render(<WeeklyGodMoments {...defaultProps} />)
    const region = screen.getByRole('region')
    expect(region).toHaveAttribute('aria-label', 'Your week with God summary')
  })

  it('returns null when not visible', () => {
    const { container } = render(<WeeklyGodMoments {...defaultProps} isVisible={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('reduced motion: dismiss is instant', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const dismiss = vi.fn()
    render(<WeeklyGodMoments {...defaultProps} dismiss={dismiss} />)
    fireEvent.click(screen.getByLabelText('Dismiss weekly summary'))
    // No need for timer advance — should be immediate
    expect(dismiss).toHaveBeenCalledOnce()
  })

  it('improving trend shows success color', () => {
    render(<WeeklyGodMoments {...defaultProps} moodTrend="improving" />)
    const label = screen.getByText('Improving')
    expect(label.className).toContain('text-success')
  })
})
