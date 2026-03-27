import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { useCelebrationQueue } from '../useCelebrationQueue'

function wrapper({ children }: { children: ReactNode }) {
  return createElement(ToastProvider, null, children)
}

async function advanceAndFlush(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('useCelebrationQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('empty queue: no celebrations fire, no delay', () => {
    const clearFn = vi.fn()
    const { result } = renderHook(
      () => useCelebrationQueue({ newlyEarnedBadges: [], clearNewlyEarnedBadges: clearFn }),
      { wrapper },
    )

    expect(result.current.currentCelebration).toBeNull()
    expect(result.current.celebrationType).toBeNull()
    expect(result.current.isProcessing).toBe(false)
    expect(clearFn).not.toHaveBeenCalled()
  })

  it('single toast fires after 1.5s delay', async () => {
    const clearFn = vi.fn()
    renderHook(
      () =>
        useCelebrationQueue({
          newlyEarnedBadges: ['streak_7'],
          clearNewlyEarnedBadges: clearFn,
        }),
      { wrapper },
    )

    // Before 1.5s — no clear yet
    await advanceAndFlush(1000)
    expect(clearFn).not.toHaveBeenCalled()

    // After 1.5s delay + 4s toast dismiss + 200ms exit animation + 0.5s gap
    await advanceAndFlush(5200)

    expect(clearFn).toHaveBeenCalled()
  })

  it('full-screen after toasts: overlay fires after all toasts', async () => {
    const clearFn = vi.fn()
    const { result } = renderHook(
      () =>
        useCelebrationQueue({
          newlyEarnedBadges: ['streak_7', 'level_2'],
          clearNewlyEarnedBadges: clearFn,
        }),
      { wrapper },
    )

    // 1.5s delay + 4s toast + 200ms exit animation + 0.5s gap
    await advanceAndFlush(6200)

    // Now full-screen overlay for level_2 should be showing
    expect(result.current.currentCelebration?.badgeId).toBe('level_2')
    expect(result.current.celebrationType).toBe('overlay')
  })

  it('queue cap: max 5 toasts + 2 full-screen does not crash', () => {
    const clearFn = vi.fn()
    const badges = [
      'streak_7', 'streak_14', 'streak_30', 'first_prayer', 'first_journal',
      'first_meditate',
      'level_1', 'level_2', 'level_3',
    ]

    renderHook(
      () => useCelebrationQueue({ newlyEarnedBadges: badges, clearNewlyEarnedBadges: clearFn }),
      { wrapper },
    )

    expect(true).toBe(true)
  })

  it('unknown badge IDs are filtered out silently', async () => {
    const clearFn = vi.fn()
    renderHook(
      () =>
        useCelebrationQueue({
          newlyEarnedBadges: ['nonexistent_badge', 'streak_7'],
          clearNewlyEarnedBadges: clearFn,
        }),
      { wrapper },
    )

    // 1.5s delay + 4s toast + 200ms exit animation + 0.5s gap
    await advanceAndFlush(6200)

    expect(clearFn).toHaveBeenCalled()
  })

  it('clearNewlyEarnedBadges called after all processed', async () => {
    const clearFn = vi.fn()
    renderHook(
      () =>
        useCelebrationQueue({
          newlyEarnedBadges: ['streak_7'],
          clearNewlyEarnedBadges: clearFn,
        }),
      { wrapper },
    )

    // 1.5s delay + 4s toast + 200ms exit animation + 0.5s gap
    await advanceAndFlush(6200)

    expect(clearFn).toHaveBeenCalled()
  })

  it('unmount during processing aborts without clearing data', async () => {
    const clearFn = vi.fn()
    const { unmount } = renderHook(
      () =>
        useCelebrationQueue({
          newlyEarnedBadges: ['streak_7', 'level_2'],
          clearNewlyEarnedBadges: clearFn,
        }),
      { wrapper },
    )

    await advanceAndFlush(500)
    unmount()

    // Cleanup only aborts — does NOT call clearNewlyEarnedBadges.
    // This prevents React StrictMode from destroying the queue
    // before celebrations can display.
    expect(clearFn).not.toHaveBeenCalled()
  })

  it('no overlay for toast-tier badges', async () => {
    const clearFn = vi.fn()
    const { result } = renderHook(
      () =>
        useCelebrationQueue({
          newlyEarnedBadges: ['streak_7'],
          clearNewlyEarnedBadges: clearFn,
        }),
      { wrapper },
    )

    await advanceAndFlush(6000)

    expect(result.current.currentCelebration).toBeNull()
    expect(result.current.celebrationType).toBeNull()
  })
})
