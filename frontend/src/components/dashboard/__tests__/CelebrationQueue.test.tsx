import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/Toast'
import { CelebrationQueue } from '../CelebrationQueue'

function renderWithProvider(newlyEarned: string[], clearFn: () => void) {
  return render(
    <ToastProvider>
      <CelebrationQueue
        newlyEarnedBadges={newlyEarned}
        clearNewlyEarnedBadges={clearFn}
      />
    </ToastProvider>,
  )
}

async function advanceAndFlush(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('CelebrationQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders no dialog when no badges', () => {
    const clearFn = vi.fn()
    renderWithProvider([], clearFn)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('overlay renders for full-screen badges', async () => {
    const clearFn = vi.fn()
    renderWithProvider(['level_2'], clearFn)

    // Wait for 1.5s initial delay
    await advanceAndFlush(1500)

    // Full-screen overlay should show
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Sprout')).toBeInTheDocument()
  })

  it('no overlay for toast-tier badges', async () => {
    const clearFn = vi.fn()
    renderWithProvider(['streak_7'], clearFn)

    // Wait for processing
    await advanceAndFlush(6000)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sequential processing: toast then overlay', async () => {
    const clearFn = vi.fn()
    renderWithProvider(['streak_7', 'level_2'], clearFn)

    // 1.5s delay + 4s toast + 200ms exit animation + 0.5s gap
    await advanceAndFlush(6200)

    // Now overlay should show
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Sprout')).toBeInTheDocument()
  })
})
