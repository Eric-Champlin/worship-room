import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BibleHero } from '../BibleHero'

describe('BibleHero', () => {
  it('renders heading text', () => {
    render(<BibleHero />)
    expect(screen.getByText('Your')).toBeInTheDocument()
    expect(screen.getByText('Study Bible')).toBeInTheDocument()
  })

  it('top line renders as white text', () => {
    render(<BibleHero />)
    const topLine = screen.getByText('Your')
    expect(topLine.className).toContain('text-white')
  })

  it('bottom line renders with gradient style', () => {
    render(<BibleHero />)
    const bottomLine = screen.getByText('Study Bible')
    expect(bottomLine.style.backgroundClip).toBeTruthy()
  })

  it('heading sizes follow SectionHeading pattern', () => {
    render(<BibleHero />)
    const topLine = screen.getByText('Your')
    const bottomLine = screen.getByText('Study Bible')
    expect(topLine.className).toContain('text-2xl')
    expect(bottomLine.className).toContain('text-4xl')
  })

  it('does not render the pre-polish subtitle', () => {
    render(<BibleHero />)
    expect(
      screen.queryByText(/No account needed/)
    ).not.toBeInTheDocument()
  })

  it('has correct aria-labelledby', () => {
    render(<BibleHero />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.id).toBe('bible-hero-heading')
    const section = heading.closest('section')
    expect(section?.getAttribute('aria-labelledby')).toBe('bible-hero-heading')
  })

  it('does not use font-script', () => {
    const { container } = render(<BibleHero />)
    expect(container.querySelector('.font-script')).toBeNull()
  })

  it('uses Spec 14 cinematic-hero navbar-compensated padding pt-[145px] pb-12 (no responsive modifiers)', () => {
    render(<BibleHero />)
    const heading = screen.getByRole('heading', { level: 1 })
    const section = heading.closest('section')
    expect(section?.className).toContain('pt-[145px]')
    expect(section?.className).toContain('pb-12')
    // Responsive padding modifiers removed — navbar height is constant across breakpoints
    expect(section?.className).not.toContain('sm:pt-32')
    expect(section?.className).not.toContain('sm:pb-14')
    expect(section?.className).not.toContain('lg:pt-32')
    // Pre-BB-53 padding removed (imbalanced 2.47:1 ratio)
    expect(section?.className).not.toContain('pt-36')
    expect(section?.className).not.toContain('sm:pt-40')
    expect(section?.className).not.toContain('lg:pt-44')
    // Pre-Spec-14 padding removed
    expect(section?.className).not.toContain('pt-28')
  })

  it('mounts CinematicHeroBackground as first child (Spec 14)', () => {
    const { container } = render(<BibleHero />)
    const cinematic = container.querySelector('[data-testid="cinematic-hero-background"]')
    expect(cinematic).toBeInTheDocument()
    const section = container.querySelector('section[aria-labelledby="bible-hero-heading"]')
    expect(section?.firstElementChild).toBe(cinematic)
  })

  it('has no inline background style (no ATMOSPHERIC_HERO_BG)', () => {
    render(<BibleHero />)
    const heading = screen.getByRole('heading', { level: 1 })
    const section = heading.closest('section')
    const styleAttr = section?.getAttribute('style') ?? ''
    expect(styleAttr.toLowerCase()).not.toContain('background')
  })

  it('preserves 2-line heading (Your + Study Bible)', () => {
    render(<BibleHero />)
    const topLine = screen.getByText('Your')
    const bottomLine = screen.getByText('Study Bible')
    expect(topLine.tagName).toBe('SPAN')
    expect(bottomLine.tagName).toBe('SPAN')
    expect(topLine.className).toContain('block')
    expect(bottomLine.className).toContain('block')
  })
})
