import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DifferentiatorSection } from '../DifferentiatorSection'
import { DIFFERENTIATORS } from '../differentiator-data'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base = 100, initial = 0) => ({
    transitionDelay: `${initial + i * base}ms`,
  }),
}))

const COMPETITOR_NAMES = [
  'YouVersion',
  'Pray.com',
  'Hallow',
  'Abide',
  'Glorify',
  'Bible app',
  'prayer app',
]

describe('differentiator-data', () => {
  it('exports DIFFERENTIATORS array with 6 items', () => {
    expect(DIFFERENTIATORS).toHaveLength(6)
  })

  it('each item has icon, title, and description', () => {
    for (const item of DIFFERENTIATORS) {
      expect(item).toHaveProperty('icon')
      expect(typeof item.title).toBe('string')
      expect(typeof item.description).toBe('string')
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(0)
    }
  })

  it('no competitor names in any title or description', () => {
    for (const item of DIFFERENTIATORS) {
      for (const name of COMPETITOR_NAMES) {
        expect(item.title.toLowerCase()).not.toContain(name.toLowerCase())
        expect(item.description.toLowerCase()).not.toContain(name.toLowerCase())
      }
    }
  })
})

describe('DifferentiatorSection', () => {
  it('renders section heading', () => {
    render(<DifferentiatorSection />)
    expect(
      screen.getByRole('heading', { name: /built for your heart/i })
    ).toBeInTheDocument()
  })

  it('renders tagline', () => {
    render(<DifferentiatorSection />)
    expect(
      screen.getByText(/the things we'll never do/i)
    ).toBeInTheDocument()
  })

  it('renders all 6 card titles', () => {
    render(<DifferentiatorSection />)
    for (const item of DIFFERENTIATORS) {
      expect(screen.getByText(item.title)).toBeInTheDocument()
    }
  })

  it('renders all 6 card descriptions', () => {
    render(<DifferentiatorSection />)
    for (const item of DIFFERENTIATORS) {
      expect(screen.getByText(item.description)).toBeInTheDocument()
    }
  })

  it('section has aria-label', () => {
    render(<DifferentiatorSection />)
    expect(
      screen.getByRole('region', { name: /what makes worship room different/i })
    ).toBeInTheDocument()
  })

  it('renders 6 icon containers', () => {
    const { container } = render(<DifferentiatorSection />)
    const iconContainers = container.querySelectorAll('.rounded-xl')
    expect(iconContainers).toHaveLength(6)
  })

  it('all icons have aria-hidden', () => {
    const { container } = render(<DifferentiatorSection />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(6)
    for (const svg of svgs) {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('uses GlowBackground', () => {
    const { container } = render(<DifferentiatorSection />)
    expect(container.querySelector('.bg-hero-bg')).toBeInTheDocument()
  })

  it('cards have stagger delay styles', () => {
    const { container } = render(<DifferentiatorSection />)
    const cards = container.querySelectorAll('.scroll-reveal')
    // First card wrapper (index 1, since heading wrapper is index 0)
    const firstCard = cards[1] as HTMLElement
    expect(firstCard.style.transitionDelay).toBe('200ms')
    // Last card wrapper (index 6)
    const lastCard = cards[6] as HTMLElement
    expect(lastCard.style.transitionDelay).toBe('700ms')
  })

  it('cards have scroll-reveal and is-visible classes', () => {
    const { container } = render(<DifferentiatorSection />)
    const revealElements = container.querySelectorAll('.scroll-reveal.is-visible')
    // 1 heading wrapper + 6 card wrappers = 7
    expect(revealElements).toHaveLength(7)
  })

  it('renders updated card titles per HP-9 spec', () => {
    render(<DifferentiatorSection />)
    expect(screen.getByText('Your time is sacred')).toBeInTheDocument()
    expect(screen.getByText('Your conversations stay private')).toBeInTheDocument()
    expect(screen.getByText('AI That Meets You Where You Are')).toBeInTheDocument()
  })

  it('renders updated card descriptions per HP-9 spec', () => {
    render(<DifferentiatorSection />)
    expect(screen.getByText(/we welcome you back/i)).toBeInTheDocument()
    expect(screen.getByText(/AI woven through every experience/i)).toBeInTheDocument()
  })

  it('no competitor names in rendered content', () => {
    const { container } = render(<DifferentiatorSection />)
    const textContent = container.textContent?.toLowerCase() ?? ''
    for (const name of COMPETITOR_NAMES) {
      expect(textContent).not.toContain(name.toLowerCase())
    }
  })
})
