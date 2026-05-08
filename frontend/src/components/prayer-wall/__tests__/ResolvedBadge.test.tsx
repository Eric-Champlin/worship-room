import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ResolvedBadge } from '../ResolvedBadge'

/**
 * Spec 4.4 — ResolvedBadge inline pill for comments marked "Most helpful" by
 * the post author of a Question post.
 */
describe('ResolvedBadge', () => {
  it('renders with the correct copy', () => {
    render(<ResolvedBadge />)
    expect(screen.getByText('Most helpful')).toBeInTheDocument()
  })

  it('has the correct aria-label', () => {
    render(<ResolvedBadge />)
    expect(
      screen.getByLabelText('Most helpful comment, marked by post author'),
    ).toBeInTheDocument()
  })

  it('accepts and applies a className override', () => {
    const { container } = render(<ResolvedBadge className="ml-2" />)
    expect(container.querySelector('span')?.className).toContain('ml-2')
  })
})
