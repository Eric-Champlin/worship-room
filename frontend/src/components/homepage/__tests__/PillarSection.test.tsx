import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PillarSection } from '../PillarSection'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base = 100, initial = 0) => ({
    transitionDelay: `${initial + i * base}ms`,
  }),
}))

const ALL_FEATURE_NAMES = [
  'Devotionals',
  'AI Prayer',
  'Journaling',
  'Meditation',
  'Mood Check-in',
  'Evening Reflection',
  'Reading Plans',
  'Seasonal Challenges',
  'Growth Garden',
  'Badges & Faith Points',
  'Insights',
  'Prayer Wall',
  'Friends & Encouragement',
  'Local Support',
]

describe('PillarSection', () => {
  it('renders section heading', () => {
    render(<PillarSection />)
    expect(
      screen.getByRole('heading', {
        name: /everything you need to heal, grow, and connect/i,
      })
    ).toBeInTheDocument()
  })

  it('renders tagline', () => {
    render(<PillarSection />)
    expect(
      screen.getByText(/three pillars\. one journey\. your pace\./i)
    ).toBeInTheDocument()
  })

  it('renders all 3 pillar headings', () => {
    render(<PillarSection />)
    expect(screen.getByRole('heading', { name: 'Healing' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Growth' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Community' })).toBeInTheDocument()
  })

  it('renders 3 GlowBackground wrappers', () => {
    const { container } = render(<PillarSection />)
    const glowBgs = container.querySelectorAll('.bg-hero-bg')
    expect(glowBgs).toHaveLength(3)
  })

  it('section has aria-label', () => {
    render(<PillarSection />)
    expect(
      screen.getByRole('region', { name: /feature pillars/i })
    ).toBeInTheDocument()
  })

  it('all 14 feature names render', () => {
    render(<PillarSection />)
    for (const name of ALL_FEATURE_NAMES) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })
})
