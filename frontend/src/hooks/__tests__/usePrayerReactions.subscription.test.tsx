import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import {
  togglePraying,
  toggleBookmark,
  toggleCandle,
  _resetForTesting,
} from '@/lib/prayer-wall/reactionsStore'

// Spec 3.11: usePrayerReactions consumes useAuth/useToast/useAuthModal for
// hydration + DI wiring. This subscription test only exercises the
// useSyncExternalStore subscription path (BB-45 anti-pattern guard) — the
// auth-state and DI-handler behavior are tested in usePrayerReactions.test.ts.
// Mock the React-context hooks so this test doesn't need provider wrapping.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isAuthResolving: false,
    user: null,
  }),
}))
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn(), showCelebrationToast: vi.fn() }),
}))
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
}))

function HookConsumer({ prayerId }: { prayerId: string }) {
  const { reactions } = usePrayerReactions()
  const reaction = reactions[prayerId]
  return (
    <div>
      <span data-testid="praying">{String(reaction?.isPraying ?? false)}</span>
      <span data-testid="bookmarked">{String(reaction?.isBookmarked ?? false)}</span>
      <span data-testid="candle">{String(reaction?.isCandle ?? false)}</span>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
})

describe('usePrayerReactions subscription', () => {
  it('re-renders when togglePraying is called externally after mount', () => {
    render(<HookConsumer prayerId="test-prayer-1" />)
    expect(screen.getByTestId('praying').textContent).toBe('false')

    act(() => {
      togglePraying('test-prayer-1')
    })

    expect(screen.getByTestId('praying').textContent).toBe('true')
  })

  it('re-renders when toggleBookmark is called externally after mount', () => {
    render(<HookConsumer prayerId="test-prayer-1" />)
    expect(screen.getByTestId('bookmarked').textContent).toBe('false')

    act(() => {
      toggleBookmark('test-prayer-1')
    })

    expect(screen.getByTestId('bookmarked').textContent).toBe('true')
  })

  it('two independent HookConsumer instances stay in sync when the store mutates', () => {
    render(
      <>
        <HookConsumer prayerId="test-prayer-2" />
        <HookConsumer prayerId="test-prayer-2" />
      </>,
    )

    act(() => {
      togglePraying('test-prayer-2')
    })

    const prayingSpans = screen.getAllByTestId('praying')
    expect(prayingSpans).toHaveLength(2)
    expect(prayingSpans[0].textContent).toBe('true')
    expect(prayingSpans[1].textContent).toBe('true')
  })

  it('candle toggle from outside the component re-renders consumers (BB-45 guard, Spec 3.7)', () => {
    render(<HookConsumer prayerId="test-prayer-candle" />)
    expect(screen.getByTestId('candle').textContent).toBe('false')

    // Mutate the store from OUTSIDE the component, after mount.
    act(() => {
      toggleCandle('test-prayer-candle')
    })

    // Failing this assertion would mean the hook skipped the subscription
    // (BB-45 anti-pattern: snapshot without subscribe) OR toggleCandle didn't notify.
    expect(screen.getByTestId('candle').textContent).toBe('true')
  })
})
