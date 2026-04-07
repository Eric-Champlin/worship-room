import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BibleHero } from '../BibleHero'

describe('BibleHero', () => {
  it('renders heading text', () => {
    render(<BibleHero />)
    expect(screen.getByText('The Word of God')).toBeInTheDocument()
    expect(screen.getByText('Open to You')).toBeInTheDocument()
  })

  it('renders subhead text', () => {
    render(<BibleHero />)
    expect(
      screen.getByText('No account needed. Free forever. The World English Bible, always here for you.')
    ).toBeInTheDocument()
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
})
