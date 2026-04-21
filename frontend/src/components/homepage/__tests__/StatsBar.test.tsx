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
  it('renders all 8 stat labels', () => {
    render(<StatsBar />)
    expect(screen.getByText('Bible Books')).toBeInTheDocument()
    expect(screen.getByText('Devotionals')).toBeInTheDocument()
    expect(screen.getByText('Reading Plans')).toBeInTheDocument()
    expect(screen.getByText('Ambient Sounds')).toBeInTheDocument()
    expect(screen.getByText('Meditation Types')).toBeInTheDocument()
    expect(screen.getByText('Seasonal Challenges')).toBeInTheDocument()
    expect(screen.getByText('Worship Playlists')).toBeInTheDocument()
    expect(screen.getByText('Bedtime Stories')).toBeInTheDocument()
  })

  it('renders in GlowBackground with bg-hero-bg', () => {
    const { container } = render(<StatsBar />)
    expect(container.querySelector('.bg-hero-bg')).toBeInTheDocument()
  })

  it('renders content statistics section', () => {
    render(<StatsBar />)
    expect(screen.getByRole('region', { name: /content statistics/i })).toBeInTheDocument()
  })

  it('has aria-label on section', () => {
    render(<StatsBar />)
    expect(
      screen.getByRole('region', { name: /content statistics/i })
    ).toBeInTheDocument()
  })

  it('stat numbers have aria-label with final values', () => {
    render(<StatsBar />)
    expect(screen.getByLabelText('66 Bible Books')).toBeInTheDocument()
    expect(screen.getByLabelText('50 Devotionals')).toBeInTheDocument()
    expect(screen.getByLabelText('10 Reading Plans')).toBeInTheDocument()
    expect(screen.getByLabelText('24 Ambient Sounds')).toBeInTheDocument()
    expect(screen.getByLabelText('6 Meditation Types')).toBeInTheDocument()
    expect(screen.getByLabelText('5 Seasonal Challenges')).toBeInTheDocument()
    expect(screen.getByLabelText('8 Worship Playlists')).toBeInTheDocument()
    expect(screen.getByLabelText('12 Bedtime Stories')).toBeInTheDocument()
  })

  it('applies scroll-reveal classes', () => {
    const { container } = render(<StatsBar />)
    const statItems = container.querySelectorAll('.scroll-reveal')
    expect(statItems).toHaveLength(8)
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

  it('section renders within GlowBackground', () => {
    const { container } = render(<StatsBar />)
    expect(container.querySelector('.bg-hero-bg')).toBeInTheDocument()
  })

  it('has elliptical glow orb with 0.30 center opacity', () => {
    const { container } = render(<StatsBar />)
    const glowOrbs = container.querySelectorAll('[aria-hidden="true"]')
    const orb = Array.from(glowOrbs).find(
      (el) => (el as HTMLElement).style.background?.includes('rgba(139, 92, 246, 0.30)')
    )
    expect(orb).toBeTruthy()
  })

  it('glow has two-stop gradient with 0.12 at 40%', () => {
    const { container } = render(<StatsBar />)
    const glowOrbs = container.querySelectorAll('[aria-hidden="true"]')
    const orb = Array.from(glowOrbs).find(
      (el) => (el as HTMLElement).style.background?.includes('0.30')
    )
    expect((orb as HTMLElement).style.background).toContain('0.12')
    expect((orb as HTMLElement).style.background).toContain('40%')
  })

  it('glow has elliptical dimensions', () => {
    const { container } = render(<StatsBar />)
    const glowOrbs = container.querySelectorAll('[aria-hidden="true"]')
    const orb = Array.from(glowOrbs).find(
      (el) => (el as HTMLElement).style.background?.includes('0.30')
    )
    expect(orb?.className).toContain('md:w-[700px]')
    expect(orb?.className).toContain('md:h-[300px]')
  })
})
