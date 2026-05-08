import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LocalSupportHero } from '../LocalSupportHero'

describe('LocalSupportHero', () => {
  it('renders heading with provided title', () => {
    render(
      <LocalSupportHero
        headingId="test-heading"
        title="Find a Church Near You"
        subtitle="A subtitle"
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Find a Church Near You' }),
    ).toBeInTheDocument()
  })

  it('renders subtitle in Inter sans, non-italic, solid white', () => {
    render(
      <LocalSupportHero
        headingId="test-heading"
        title="Test"
        subtitle="Your healing journey"
      />,
    )
    const subtitle = screen.getByText('Your healing journey')
    expect(subtitle).toBeInTheDocument()
    expect(subtitle.className).toContain('text-white')
    expect(subtitle.className).not.toContain('font-serif')
    expect(subtitle.className).not.toContain('italic')
    expect(subtitle.className).not.toContain('text-white/60')
  })

  it('renders action when provided', () => {
    render(
      <LocalSupportHero
        headingId="test-heading"
        title="Test"
        subtitle="Sub"
        action={<button>Sign In to Search</button>}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Sign In to Search' }),
    ).toBeInTheDocument()
  })

  it('renders extraContent when provided', () => {
    render(
      <LocalSupportHero
        headingId="test-heading"
        title="Test"
        subtitle="Sub"
        extraContent={<p>What is Celebrate Recovery?</p>}
      />,
    )
    expect(screen.getByText('What is Celebrate Recovery?')).toBeInTheDocument()
  })

  it('does not render action wrapper when omitted', () => {
    const { container } = render(
      <LocalSupportHero
        headingId="test-heading"
        title="Test"
        subtitle="Sub"
      />,
    )
    // Spec 14 added CinematicHeroBackground as first child of every cinematic-mounting hero.
    // Children when no extraContent/action: cinematic + heading + subtitle = 3.
    const section = container.querySelector('section')!
    expect(section.children).toHaveLength(3)
    expect(section.firstElementChild?.getAttribute('data-testid')).toBe('cinematic-hero-background')
  })

  it('renders title with centered spacing for gradient text rendering', () => {
    render(
      <LocalSupportHero
        headingId="test-heading"
        title="Test Title"
        subtitle="Sub"
      />,
    )
    const heading = screen.getByRole('heading', { name: 'Test Title' })
    expect(heading.className).toContain('px-1')
    expect(heading.className).toContain('sm:px-2')
  })

  it('heading has no font-script descendants (Caveat accent retired)', () => {
    render(
      <LocalSupportHero
        headingId="test-heading"
        title="Find a Church Near You"
        subtitle="Sub"
      />,
    )
    const heading = screen.getByRole('heading', { name: 'Find a Church Near You' })
    expect(heading.querySelector('.font-script')).toBeNull()
  })

  // Spec 5 Step 4 — GlowBackground removed (Decision 1: BackgroundCanvas at the
  // shell level provides atmosphere; Decision 16: hero gradient text is preserved
  // verbatim). The hero no longer wraps its section in GlowBackground.
  it('renders without a GlowBackground wrapper (atmospheric layer lives at shell level)', () => {
    const { container } = render(
      <LocalSupportHero
        headingId="test-heading"
        title="Test Title"
        subtitle="Sub"
      />,
    )
    const orbs = container.querySelectorAll('[data-testid="glow-orb"]')
    expect(orbs.length).toBe(0)
  })

  it('heading has gradient text styling applied', () => {
    render(
      <LocalSupportHero
        headingId="test-heading"
        title="Test Title"
        subtitle="Sub"
      />,
    )
    const heading = screen.getByRole('heading', { name: 'Test Title' })
    // GRADIENT_TEXT_STYLE sets an inline style with backgroundClip: 'text'
    const styleAttr = heading.getAttribute('style') ?? ''
    expect(styleAttr).toMatch(/background-clip|-webkit-background-clip/)
  })
})
