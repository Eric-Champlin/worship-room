import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MonthlyStatCards } from '../MonthlyStatCards'

// Force prefers-reduced-motion so count-up resolves instantly in tests
beforeEach(() => {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  )
})

const defaultProps = {
  daysActive: 24,
  daysInRange: 31,
  pointsEarned: 1847,
  startLevel: 'Sprout',
  endLevel: 'Blooming',
  levelProgressPct: 67,
  moodTrendPct: 12,
}

describe('MonthlyStatCards', () => {
  it('renders 4 stat cards', () => {
    const { container } = render(<MonthlyStatCards {...defaultProps} />)
    const cards = container.querySelectorAll('.rounded-2xl')
    expect(cards).toHaveLength(4)
  })

  it('shows days active in "N of M" format', () => {
    render(<MonthlyStatCards {...defaultProps} />)
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('of 31 days')).toBeInTheDocument()
  })

  it('shows points with comma formatting', () => {
    render(<MonthlyStatCards {...defaultProps} />)
    expect(screen.getByText('1,847')).toBeInTheDocument()
  })

  it('shows level progress bar', () => {
    render(<MonthlyStatCards {...defaultProps} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '67')
  })

  it('shows positive mood trend in green', () => {
    render(<MonthlyStatCards {...defaultProps} />)
    const trendSpan = screen.getByLabelText(/mood improved by 12 percent/i)
    expect(trendSpan).toBeInTheDocument()
    // Parent should have green class
    const parent = trendSpan.closest('p')
    expect(parent?.className).toContain('text-emerald-400')
  })

  it('shows negative mood trend in amber', () => {
    render(
      <MonthlyStatCards {...defaultProps} moodTrendPct={-8} />,
    )
    const trendSpan = screen.getByLabelText(/mood declined by 8 percent/i)
    expect(trendSpan).toBeInTheDocument()
    const parent = trendSpan.closest('p')
    expect(parent?.className).toContain('text-amber-400')
  })

  it('has responsive grid classes', () => {
    const { container } = render(<MonthlyStatCards {...defaultProps} />)
    const grid = container.querySelector('.grid')
    expect(grid?.className).toContain('grid-cols-2')
    expect(grid?.className).toContain('sm:grid-cols-4')
  })

  it('progress bar has correct aria attributes', () => {
    render(<MonthlyStatCards {...defaultProps} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar).toHaveAttribute('aria-label', 'Level progress')
  })
})
