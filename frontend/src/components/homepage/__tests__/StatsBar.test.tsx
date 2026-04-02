import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StatsBar } from '../StatsBar'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base = 100) => ({
    transitionDelay: `${i * base}ms`,
  }),
}))

vi.mock('@/hooks/useAnimatedCounter', () => ({
  useAnimatedCounter: ({ target }: { target: number }) => target,
}))

describe('StatsBar', () => {
  it('renders all 6 stat labels', () => {
    render(<StatsBar />)
    expect(screen.getByText('Devotionals')).toBeInTheDocument()
    expect(screen.getByText('Reading Plans')).toBeInTheDocument()
    expect(screen.getByText('Ambient Sounds')).toBeInTheDocument()
    expect(screen.getByText('Meditation Types')).toBeInTheDocument()
    expect(screen.getByText('Seasonal Challenges')).toBeInTheDocument()
    expect(screen.getByText('Worship Playlists')).toBeInTheDocument()
  })

  it('renders in GlowBackground with bg-hero-bg', () => {
    const { container } = render(<StatsBar />)
    expect(container.querySelector('.bg-hero-bg')).toBeInTheDocument()
  })

  it('applies border separators', () => {
    const { container } = render(<StatsBar />)
    expect(container.querySelector('.border-y')).toBeInTheDocument()
  })

  it('has aria-label on section', () => {
    render(<StatsBar />)
    expect(
      screen.getByRole('region', { name: /content statistics/i })
    ).toBeInTheDocument()
  })

  it('stat numbers have aria-label with final values', () => {
    render(<StatsBar />)
    expect(screen.getByLabelText('50 Devotionals')).toBeInTheDocument()
    expect(screen.getByLabelText('10 Reading Plans')).toBeInTheDocument()
    expect(screen.getByLabelText('24 Ambient Sounds')).toBeInTheDocument()
    expect(screen.getByLabelText('6 Meditation Types')).toBeInTheDocument()
    expect(screen.getByLabelText('5 Seasonal Challenges')).toBeInTheDocument()
    expect(screen.getByLabelText('8 Worship Playlists')).toBeInTheDocument()
  })

  it('applies scroll-reveal classes', () => {
    const { container } = render(<StatsBar />)
    const statItems = container.querySelectorAll('.scroll-reveal')
    expect(statItems).toHaveLength(6)
  })

  it('applies stagger delay styles', () => {
    const { container } = render(<StatsBar />)
    const statItems = container.querySelectorAll('.scroll-reveal')
    statItems.forEach((item, i) => {
      expect((item as HTMLElement).style.transitionDelay).toBe(
        `${i * 100}ms`
      )
    })
  })
})
