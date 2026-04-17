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

  it('uses reduced top padding pt-12 sm:pt-16 lg:pt-20', () => {
    render(<BibleHero />)
    const heading = screen.getByRole('heading', { level: 1 })
    const section = heading.closest('section')
    expect(section?.className).toContain('pt-12')
    expect(section?.className).toContain('sm:pt-16')
    expect(section?.className).toContain('lg:pt-20')
    expect(section?.className).not.toContain('pt-32')
    expect(section?.className).not.toContain('sm:pt-36')
    expect(section?.className).not.toContain('lg:pt-40')
  })
})
