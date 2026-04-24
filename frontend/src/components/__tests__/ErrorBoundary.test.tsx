import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

function ThrowingChild({ error }: { error?: Error }) {
  if (error) throw error
  return <div>child content</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>hello world</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('shows default fallback when a child throws', () => {
    const error = new Error('boom')

    render(
      <ErrorBoundary>
        <ThrowingChild error={error} />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
  })

  it('default fallback uses blameless, anti-pressure body copy', () => {
    const error = new Error('boom')

    render(
      <ErrorBoundary>
        <ThrowingChild error={error} />
      </ErrorBoundary>,
    )

    expect(
      screen.getByText('Something broke on our end. Reload to try again — your other work is safe.'),
    ).toBeInTheDocument()
  })

  it('default fallback card is announced as an alert region', () => {
    const error = new Error('boom')

    render(
      <ErrorBoundary>
        <ThrowingChild error={error} />
      </ErrorBoundary>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong')
    expect(alert).toHaveTextContent('Something broke on our end')
  })

  it('renders a custom fallback when provided', () => {
    const error = new Error('boom')

    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <ThrowingChild error={error} />
      </ErrorBoundary>,
    )

    expect(screen.getByText('custom fallback')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument()
  })
})
