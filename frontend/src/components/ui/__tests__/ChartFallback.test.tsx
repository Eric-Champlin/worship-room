import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChartFallback } from '../ChartFallback'

describe('ChartFallback', () => {
  it('renders the default message when no message prop is provided', () => {
    render(<ChartFallback />)
    expect(screen.getByText('Chart unavailable right now')).toBeInTheDocument()
  })

  it('renders a caller-supplied message', () => {
    render(<ChartFallback message="Mood chart could not load" />)
    expect(screen.getByText('Mood chart could not load')).toBeInTheDocument()
  })

  it('exposes the fallback as a polite status region for screen readers', () => {
    render(<ChartFallback />)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveTextContent('Chart unavailable right now')
  })
})
