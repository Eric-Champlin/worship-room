import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExplainSubViewError } from '../ExplainSubViewError'

describe('ExplainSubViewError', () => {
  it('renders the passed message', () => {
    render(
      <ExplainSubViewError
        kind="network"
        message="Check your connection."
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByText('Check your connection.')).toBeInTheDocument()
  })

  it('renders the "Something went wrong" heading', () => {
    render(
      <ExplainSubViewError kind="api" message="anything" onRetry={vi.fn()} />,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('has role="alert" and aria-live="assertive"', () => {
    const { container } = render(
      <ExplainSubViewError kind="safety" message="x" onRetry={vi.fn()} />,
    )
    const alert = container.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert?.getAttribute('aria-live')).toBe('assertive')
  })

  it('retry button has min-h-[44px] tap target class', () => {
    render(
      <ExplainSubViewError kind="timeout" message="x" onRetry={vi.fn()} />,
    )
    const button = screen.getByRole('button', { name: /try again/i })
    expect(button.className).toContain('min-h-[44px]')
  })

  it('calls onRetry when the button is clicked', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(<ExplainSubViewError kind="network" message="x" onRetry={onRetry} />)
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('exposes data-error-kind on the button', () => {
    render(
      <ExplainSubViewError kind="safety" message="x" onRetry={vi.fn()} />,
    )
    const button = screen.getByRole('button', { name: /try again/i })
    expect(button.getAttribute('data-error-kind')).toBe('safety')
  })
})
