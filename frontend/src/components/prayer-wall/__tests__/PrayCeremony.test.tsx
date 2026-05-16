import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWall } from '@/pages/PrayerWall'
import { _resetForTesting as resetReactionsStore } from '@/lib/prayer-wall/reactionsStore'

const mockUser = { id: 'user-sim', name: 'Eric' }

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

vi.mock('@/hooks/useStaggeredEntrance', () => ({
  useStaggeredEntrance: () => ({
    containerRef: { current: null },
    getStaggerProps: () => ({ className: '', style: {} }),
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: {
      mood: false,
      pray: false,
      listen: false,
      prayerWall: false,
      readingPlan: false,
      meditate: false,
      journal: false,
    },
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
}))

// Spec 6.3 — useNightMode internally calls setInterval(60_000) for the
// hour-boundary polling tick. Under vi.useFakeTimers(), `vi.runAllTimers()`
// would re-fire this interval indefinitely and trip the 10K-iteration safety
// abort. Mock with a static day-state return so tests that flush all timers
// don't hit the recurring interval.
vi.mock('@/hooks/useNightMode', () => ({
  useNightMode: () => ({
    active: false,
    source: 'auto' as const,
    userPreference: 'auto' as const,
  }),
}))

// Spec 6.4 — useWatchMode also runs its OWN 60s setInterval (per its
// Plan-Time Divergence #1; it doesn't share useNightMode's tick). Same
// runAllTimers risk as useNightMode above — mocking it with a static
// inactive state keeps `vi.runAllTimers()` from looping the watch interval.
vi.mock('@/hooks/useWatchMode', () => ({
  useWatchMode: () => ({
    active: false,
    source: 'auto' as const,
    userPreference: 'off' as const,
    degraded: true,
  }),
}))

// Spec 6.8 — useActiveEngagement runs a 1s setInterval to accumulate
// foreground+scroll time for the Verse-Finds-You reading-time trigger.
// At 1s cadence this is the fastest path to the 10K-iteration abort under
// `vi.runAllTimers()`. Mock as a no-op so the engagement interval never
// arms.
vi.mock('@/hooks/useActiveEngagement', () => ({
  useActiveEngagement: () => {},
}))

// Spec 6.11b — usePresence polls /api/v1/prayer-wall/presence on a 30s
// setInterval while the tab is visible. PresenceIndicator mounts it
// unconditionally on PrayerWall, so `vi.runAllTimers()` would loop the
// poll interval the same way. Mock with the suppressed-state shape
// (`count: null`, `paused: true`) so PresenceIndicator renders inert.
vi.mock('@/hooks/usePresence', () => ({
  usePresence: () => ({
    count: null,
    paused: true,
  }),
}))

// Mock prayer data: set prayer-1 userId to match mockUser and clear its initial praying state
vi.mock('@/mocks/prayer-wall-mock-data', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/mocks/prayer-wall-mock-data')>()
  return {
    ...original,
    getMockPrayers: () => {
      const prayers = original.getMockPrayers()
      // Replace the first prayer's userId so it matches our mockUser
      return [
        { ...prayers[0], userId: 'user-sim' },
        ...prayers.slice(1),
      ]
    },
    getMockReactions: () => {
      const reactions = original.getMockReactions()
      // Clear prayer-1's initial praying state so it appears as a "Pray" button
      if (reactions['prayer-1']) {
        reactions['prayer-1'] = { ...reactions['prayer-1'], isPraying: false }
      }
      return reactions
    },
  }
})

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/prayer-wall']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <PrayerWall />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Pray Ceremony', { timeout: 30000 }, () => {
  beforeEach(() => {
    localStorage.clear()
    resetReactionsStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ceremony animation elements appear on pray toggle ON', () => {
    renderPage()
    const prayButtons = screen.getAllByLabelText(/pray for this request/i)
    fireEvent.click(prayButtons[0])
    expect(screen.getByText('+1 prayer')).toBeInTheDocument()
  })

  it('no ceremony elements on pray toggle OFF', () => {
    renderPage()

    // Let stagger/IntersectionObserver settle
    act(() => { vi.advanceTimersByTime(0) })

    const prayButtons = screen.getAllByLabelText(/pray for this request/i)

    // Toggle ON
    act(() => { fireEvent.click(prayButtons[0]) })
    act(() => {
      vi.advanceTimersByTime(600)
    })

    // Toggle OFF — re-query inside act() to settle the label transition
    act(() => {
      const stopButtons = screen.getAllByLabelText(/stop praying for this request/i)
      fireEvent.click(stopButtons[0])
    })
    act(() => { vi.advanceTimersByTime(0) })
    expect(screen.queryByText('+1 prayer')).not.toBeInTheDocument()
  })

  it('animation elements cleaned up after 600ms', () => {
    renderPage()
    const prayButtons = screen.getAllByLabelText(/pray for this request/i)
    fireEvent.click(prayButtons[0])
    expect(screen.getByText('+1 prayer')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(screen.queryByText('+1 prayer')).not.toBeInTheDocument()
  })

  it('animation elements have aria-hidden', () => {
    renderPage()
    const prayButtons = screen.getAllByLabelText(/pray for this request/i)
    fireEvent.click(prayButtons[0])

    const floatText = screen.getByText('+1 prayer')
    expect(floatText).toHaveAttribute('aria-hidden', 'true')
  })

  it('success toast fires after 600ms on pray toggle ON', () => {
    renderPage()
    const prayButtons = screen.getAllByLabelText(/pray for this request/i)
    fireEvent.click(prayButtons[0])

    expect(screen.queryByText('Your prayer has been lifted up')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(screen.getByText('Your prayer has been lifted up')).toBeInTheDocument()
  })

  it('no toast on untoggle (clicking already-praying button)', () => {
    renderPage()

    // Let stagger/IntersectionObserver settle
    act(() => { vi.advanceTimersByTime(0) })

    // Mock data has some prayers already praying — click one to untoggle
    const stopButtons = screen.getAllByLabelText(/stop praying for this request/i)
    expect(stopButtons.length).toBeGreaterThan(0)

    act(() => { fireEvent.click(stopButtons[0]) })

    act(() => {
      vi.advanceTimersByTime(1200)
    })

    // No "lifted up" toast should appear for untoggle
    expect(screen.queryByText('Your prayer has been lifted up')).not.toBeInTheDocument()
  })

  it('rapid toggle cancels pending toasts', () => {
    renderPage()

    // Let stagger and cleanup effects settle
    act(() => { vi.advanceTimersByTime(0) })
    act(() => { vi.advanceTimersByTime(0) })

    const prayButtons = screen.getAllByLabelText(/pray for this request/i)

    // Toggle ON
    act(() => { fireEvent.click(prayButtons[0]) })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Toggle OFF before ceremony completes
    const stopButtons = screen.getAllByLabelText(/stop praying for this request/i)
    act(() => { fireEvent.click(stopButtons[0]) })

    act(() => {
      vi.runAllTimers()
    })

    // No toast should have fired
    expect(screen.queryByText('Your prayer has been lifted up')).not.toBeInTheDocument()
  })

  it('rapid untoggle cancels animation elements immediately', () => {
    renderPage()
    const prayButtons = screen.getAllByLabelText(/pray for this request/i)
    const btn = prayButtons[0]

    // Toggle ON — animation starts
    fireEvent.click(btn)
    expect(screen.getByText('+1 prayer')).toBeInTheDocument()

    // Toggle OFF immediately — click same button (now "stop praying" label)
    fireEvent.click(btn)
    expect(screen.queryByText('+1 prayer')).not.toBeInTheDocument()
  })

  it('author notification toast fires at 800ms when userId matches', () => {
    renderPage()
    // prayer-1 has userId='user-sim' (mocked) and isPraying=false (mocked),
    // so it appears first in the "Pray for this request" button list
    const prayButtons = screen.getAllByLabelText(/pray for this request/i)
    fireEvent.click(prayButtons[0])

    // At 600ms: success toast only
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(screen.getByText('Your prayer has been lifted up')).toBeInTheDocument()
    expect(screen.queryByText(/Someone is praying for your request/)).not.toBeInTheDocument()

    // At 800ms: author notification fires
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByText(/Someone is praying for your request/)).toBeInTheDocument()
  })

  it('no author notification when userId does not match', () => {
    renderPage()
    // Second prayer has userId='user-2' (does not match 'user-sim')
    const prayButtons = screen.getAllByLabelText(/pray for this request/i)
    fireEvent.click(prayButtons[1])

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Success toast fires but NOT the author notification
    expect(screen.getByText('Your prayer has been lifted up')).toBeInTheDocument()
    expect(screen.queryByText(/Someone is praying for your request/)).not.toBeInTheDocument()
  })
})
