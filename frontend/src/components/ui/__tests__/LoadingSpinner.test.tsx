import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoadingSpinner } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('exposes status role for screen readers', () => {
    render(<LoadingSpinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the default "Loading" sr-only label', () => {
    render(<LoadingSpinner />)
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('renders a caller-supplied label', () => {
    render(<LoadingSpinner label="Saving your prayer" />)
    expect(screen.getByText('Saving your prayer')).toBeInTheDocument()
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
  })

  it('defaults to size 18 (width/height)', () => {
    const { container } = render(<LoadingSpinner />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '18')
    expect(svg).toHaveAttribute('height', '18')
  })

  it('applies a custom size to the SVG', () => {
    const { container } = render(<LoadingSpinner size={32} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '32')
    expect(svg).toHaveAttribute('height', '32')
  })

  it('falls back to static opacity when motion is reduced', () => {
    const { container } = render(<LoadingSpinner />)
    const svg = container.querySelector('svg')
    expect(svg?.className.baseVal).toContain('motion-reduce:opacity-60')
    expect(svg?.className.baseVal).toContain('motion-safe:animate-spin')
  })

  it('marks the SVG itself as decorative (aria-hidden)', () => {
    const { container } = render(<LoadingSpinner />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('merges className props onto the wrapper', () => {
    render(<LoadingSpinner className="text-primary" />)
    const status = screen.getByRole('status')
    expect(status.className).toContain('text-primary')
  })
})
