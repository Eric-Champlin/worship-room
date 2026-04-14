import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExplainSubViewError } from '../ExplainSubViewError'

// The hook's rate-limit template that the sub-view error component
// substitutes at render time. Duplicated here (instead of imported) so
// the test locks the exact template shape the component expects.
const RATE_LIMIT_TEMPLATE =
  "You're going faster than our AI helper can keep up. Try again in {seconds} seconds."

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

// ──────────────────────────────────────────────────────────────────────────
// BB-32 — rate-limit countdown UI tests (appended; 6 above untouched)
// ──────────────────────────────────────────────────────────────────────────

describe('ExplainSubViewError — rate-limit countdown (BB-32)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('substitutes {seconds} with the initial retryAfterSeconds on first render', () => {
    render(
      <ExplainSubViewError
        kind="rate-limit"
        message={RATE_LIMIT_TEMPLATE}
        onRetry={vi.fn()}
        retryAfterSeconds={8}
      />,
    )
    expect(screen.getByText(/Try again in 8 seconds/)).toBeInTheDocument()
  })

  it('decrements the countdown once per second as fake timers advance', () => {
    render(
      <ExplainSubViewError
        kind="rate-limit"
        message={RATE_LIMIT_TEMPLATE}
        onRetry={vi.fn()}
        retryAfterSeconds={5}
      />,
    )
    expect(screen.getByText(/Try again in 5 seconds/)).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(/Try again in 4 seconds/)).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(/Try again in 3 seconds/)).toBeInTheDocument()
  })

  it('countdown reaches 0 and displays "Try again in 0 seconds"', () => {
    render(
      <ExplainSubViewError
        kind="rate-limit"
        message={RATE_LIMIT_TEMPLATE}
        onRetry={vi.fn()}
        retryAfterSeconds={2}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(5000) // well past the initial 2s
    })
    expect(screen.getByText(/Try again in 0 seconds/)).toBeInTheDocument()
  })

  it('retry button is disabled while countdown is active', () => {
    render(
      <ExplainSubViewError
        kind="rate-limit"
        message={RATE_LIMIT_TEMPLATE}
        onRetry={vi.fn()}
        retryAfterSeconds={5}
      />,
    )
    const button = screen.getByRole('button', { name: /try again/i })
    expect(button).toBeDisabled()
    expect(button.getAttribute('aria-disabled')).toBe('true')
  })

  it('retry button carries the disabled:opacity-40 Tailwind class', () => {
    render(
      <ExplainSubViewError
        kind="rate-limit"
        message={RATE_LIMIT_TEMPLATE}
        onRetry={vi.fn()}
        retryAfterSeconds={5}
      />,
    )
    const button = screen.getByRole('button', { name: /try again/i })
    expect(button.className).toContain('disabled:opacity-40')
    expect(button.className).toContain('disabled:cursor-not-allowed')
  })

  it('retry button becomes enabled when the countdown reaches 0', () => {
    render(
      <ExplainSubViewError
        kind="rate-limit"
        message={RATE_LIMIT_TEMPLATE}
        onRetry={vi.fn()}
        retryAfterSeconds={1}
      />,
    )
    const button = screen.getByRole('button', { name: /try again/i })
    expect(button).toBeDisabled()
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(button).not.toBeDisabled()
    expect(button.getAttribute('aria-disabled')).toBeNull()
  })

  it('clicking the retry button while disabled does NOT call onRetry', () => {
    const onRetry = vi.fn()
    render(
      <ExplainSubViewError
        kind="rate-limit"
        message={RATE_LIMIT_TEMPLATE}
        onRetry={onRetry}
        retryAfterSeconds={5}
      />,
    )
    const button = screen.getByRole('button', { name: /try again/i })
    button.click()
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('clicking the retry button after countdown ends calls onRetry', () => {
    const onRetry = vi.fn()
    render(
      <ExplainSubViewError
        kind="rate-limit"
        message={RATE_LIMIT_TEMPLATE}
        onRetry={onRetry}
        retryAfterSeconds={1}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    const button = screen.getByRole('button', { name: /try again/i })
    button.click()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('non-rate-limit kinds render the message verbatim (no template substitution)', () => {
    render(
      <ExplainSubViewError
        kind="network"
        message="Raw network error message with {seconds} literal"
        onRetry={vi.fn()}
      />,
    )
    // For non-rate-limit kinds, `{seconds}` is NOT substituted
    expect(
      screen.getByText('Raw network error message with {seconds} literal'),
    ).toBeInTheDocument()
  })

  it('countdown interval is cleaned up on unmount (no errors advancing timers)', () => {
    const { unmount } = render(
      <ExplainSubViewError
        kind="rate-limit"
        message={RATE_LIMIT_TEMPLATE}
        onRetry={vi.fn()}
        retryAfterSeconds={5}
      />,
    )
    unmount()
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(10_000)
      })
    }).not.toThrow()
  })

  it('countdown resets when retryAfterSeconds prop changes', () => {
    const { rerender } = render(
      <ExplainSubViewError
        kind="rate-limit"
        message={RATE_LIMIT_TEMPLATE}
        onRetry={vi.fn()}
        retryAfterSeconds={5}
      />,
    )
    expect(screen.getByText(/Try again in 5 seconds/)).toBeInTheDocument()
    rerender(
      <ExplainSubViewError
        kind="rate-limit"
        message={RATE_LIMIT_TEMPLATE}
        onRetry={vi.fn()}
        retryAfterSeconds={8}
      />,
    )
    expect(screen.getByText(/Try again in 8 seconds/)).toBeInTheDocument()
  })
})
