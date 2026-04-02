import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { FeatureShowcase } from '../FeatureShowcase'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base: number) => ({
    transitionDelay: `${i * base}ms`,
  }),
}))

describe('FeatureShowcase', () => {
  it('renders section heading "Experience Worship Room"', () => {
    render(<FeatureShowcase />)
    expect(
      screen.getByRole('heading', { name: /experience worship room/i })
    ).toBeInTheDocument()
  })

  it('renders tagline text', () => {
    render(<FeatureShowcase />)
    expect(
      screen.getByText(
        /everything you need for your spiritual journey/i
      )
    ).toBeInTheDocument()
  })

  it('renders 5 tab buttons', () => {
    render(<FeatureShowcase />)
    expect(screen.getAllByRole('tab')).toHaveLength(5)
  })

  it('default tab is "Daily Devotional" (first tab)', () => {
    render(<FeatureShowcase />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByText('Start Each Day with Purpose')
    ).toBeInTheDocument()
  })

  it('clicking a tab changes preview content', async () => {
    const user = userEvent.setup()
    render(<FeatureShowcase />)

    const tabs = screen.getAllByRole('tab')
    await user.click(tabs[1]) // AI Prayer tab

    expect(
      screen.getByText('Prayers That Know Your Heart')
    ).toBeInTheDocument()

    const prayerPanel = screen
      .getAllByRole('tabpanel', { hidden: true })
      .find((p) => p.id === 'panel-prayer')
    expect(prayerPanel?.className).toContain('opacity-100')
  })

  it('wraps content in GlowBackground with bg-hero-bg', () => {
    const { container } = render(<FeatureShowcase />)
    const glowBg = container.querySelector('.bg-hero-bg')
    expect(glowBg).toBeInTheDocument()
  })
})
