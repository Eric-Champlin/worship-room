import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrayCompletionScreen } from '../PrayCompletionScreen'

describe('PrayCompletionScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the literal "Amen." text with a period (no exclamation, no celebration copy)', () => {
    render(<PrayCompletionScreen onComplete={() => {}} />)
    const text = screen.getByText('Amen.')
    expect(text).toBeInTheDocument()
    // Hard guard against celebration-copy regressions.
    expect(screen.queryByText(/great|good job|you did it|prayed for/i)).toBeNull()
    expect(text.textContent).not.toContain('!')
  })

  it('uses role=status with aria-live=polite (NOT assertive)', () => {
    render(<PrayCompletionScreen onComplete={() => {}} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('fires onComplete exactly once after AMEN_SCREEN_HOLD_MS', () => {
    const onComplete = vi.fn()
    render(<PrayCompletionScreen onComplete={onComplete} />)
    expect(onComplete).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(3000) })
    expect(onComplete).toHaveBeenCalledOnce()
    // Advance well past the hold; should remain exactly once.
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('cleans up its timeout on unmount so onComplete does not fire after unmount', () => {
    const onComplete = vi.fn()
    const { unmount } = render(<PrayCompletionScreen onComplete={onComplete} />)
    unmount()
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(onComplete).not.toHaveBeenCalled()
  })
})
