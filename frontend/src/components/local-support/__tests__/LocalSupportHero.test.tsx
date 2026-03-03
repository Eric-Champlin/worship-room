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

  it('renders subtitle', () => {
    render(
      <LocalSupportHero
        headingId="test-heading"
        title="Test"
        subtitle="Your healing journey"
      />,
    )
    expect(screen.getByText('Your healing journey')).toBeInTheDocument()
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
    expect(
      screen.getByText('What is Celebrate Recovery?'),
    ).toBeInTheDocument()
  })

  it('does not render action wrapper when omitted', () => {
    const { container } = render(
      <LocalSupportHero
        headingId="test-heading"
        title="Test"
        subtitle="Sub"
      />,
    )
    // heading + subtitle — no extra wrappers
    const section = container.querySelector('section')!
    expect(section.children).toHaveLength(2)
  })

  it('heading uses font-script (Caveat)', () => {
    render(
      <LocalSupportHero
        headingId="test-heading"
        title="Test Title"
        subtitle="Sub"
      />,
    )
    const heading = screen.getByRole('heading', { name: 'Test Title' })
    expect(heading.className).toContain('font-script')
    expect(heading.className).not.toContain('font-sans')
  })
})
