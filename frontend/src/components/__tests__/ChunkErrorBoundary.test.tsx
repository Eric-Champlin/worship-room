import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChunkErrorBoundary } from '../ChunkErrorBoundary'

// Component that throws on demand
function ThrowingChild({ error }: { error?: Error }) {
  if (error) throw error
  return <div>child content</div>
}

class OuterErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { caught: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { caught: false }
  }
  static getDerivedStateFromError() {
    return { caught: true }
  }
  render() {
    if (this.state.caught) return <div>outer caught</div>
    return this.props.children
  }
}

describe('ChunkErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error occurs', () => {
    render(
      <ChunkErrorBoundary>
        <div>hello world</div>
      </ChunkErrorBoundary>
    )
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('shows error UI for "Failed to fetch dynamically imported module" error', () => {
    const error = new Error('Failed to fetch dynamically imported module: /chunk.js')

    render(
      <ChunkErrorBoundary>
        <ThrowingChild error={error} />
      </ChunkErrorBoundary>
    )

    expect(screen.getByText('Something went wrong loading this page')).toBeInTheDocument()
    expect(screen.getByText(/slow connection/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows error UI for ChunkLoadError name', () => {
    const error = new Error('chunk failed')
    error.name = 'ChunkLoadError'

    render(
      <ChunkErrorBoundary>
        <ThrowingChild error={error} />
      </ChunkErrorBoundary>
    )

    expect(screen.getByText('Something went wrong loading this page')).toBeInTheDocument()
  })

  it('shows error UI for "Loading chunk" error', () => {
    const error = new Error('Loading chunk 123 failed')

    render(
      <ChunkErrorBoundary>
        <ThrowingChild error={error} />
      </ChunkErrorBoundary>
    )

    expect(screen.getByText('Something went wrong loading this page')).toBeInTheDocument()
  })

  it('does not catch non-chunk errors (propagates to outer boundary)', () => {
    const error = new Error('Some generic error')

    render(
      <OuterErrorBoundary>
        <ChunkErrorBoundary>
          <ThrowingChild error={error} />
        </ChunkErrorBoundary>
      </OuterErrorBoundary>
    )

    expect(screen.getByText('outer caught')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong loading this page')).not.toBeInTheDocument()
  })

  it('Try again button calls window.location.reload', async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    })

    const error = new Error('Failed to fetch dynamically imported module: /chunk.js')

    render(
      <ChunkErrorBoundary>
        <ThrowingChild error={error} />
      </ChunkErrorBoundary>
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reloadMock).toHaveBeenCalledOnce()
  })

  it('error fallback has dark background class', () => {
    const error = new Error('Failed to fetch dynamically imported module: /chunk.js')

    const { container } = render(
      <ChunkErrorBoundary>
        <ThrowingChild error={error} />
      </ChunkErrorBoundary>
    )

    const bg = container.querySelector('.bg-dashboard-dark')
    expect(bg).toBeInTheDocument()
  })

  it('button has accessible focus ring classes', () => {
    const error = new Error('Failed to fetch dynamically imported module: /chunk.js')

    render(
      <ChunkErrorBoundary>
        <ThrowingChild error={error} />
      </ChunkErrorBoundary>
    )

    const button = screen.getByRole('button', { name: 'Try again' })
    expect(button.className).toContain('focus-visible:ring-2')
  })
})
