import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { Dashboard } from '@/pages/Dashboard'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// Mock matchMedia — default: no reduced motion
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: matchMediaMock,
})

vi.mock('@/hooks/useWhisperToast', () => ({
  useWhisperToast: () => ({ showWhisperToast: vi.fn() }),
}))

// Mock AudioProvider
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    isPlaying: false,
    currentSceneName: null,
    currentSceneId: null,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: null,
    sleepTimer: null,
    activeRoutine: null,
    masterVolume: 0.8,
    foregroundBackgroundBalance: 0.5,
    foregroundEndedCounter: 0,
  }),
  useAudioDispatch: () => vi.fn(),
}))

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
}))

// Mock useScenePlayer
vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    activeSceneId: null,
    loadScene: vi.fn(),
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null,
    confirmRoutineInterrupt: vi.fn(),
    cancelRoutineInterrupt: vi.fn(),
  }),
}))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  localStorage.setItem('wr_onboarding_complete', 'true')

  // Reset matchMedia to no reduced motion (tests may override)
  matchMediaMock.mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderDashboard() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <Dashboard />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function seedTodayEntry() {
  const entry: MoodEntry = {
    id: 'test-today',
    date: getLocalDateString(),
    mood: 4,
    moodLabel: 'Good',
    timestamp: Date.now(),
    verseSeen: 'Psalm 107:1',
  }
  localStorage.setItem('wr_mood_entries', JSON.stringify([entry]))
}

describe('Dashboard Entrance Animations', () => {
  it('cards have animate-widget-enter class on initial render', () => {
    seedTodayEntry()
    renderDashboard()

    const animatedElements = document.querySelectorAll('[class*="animate-widget-enter"]')
    // Hero wrapper + 6 grid cards (mood, streak, activity, friends, weekly recap, quick actions)
    expect(animatedElements.length).toBeGreaterThanOrEqual(7)
  })

  it('cards have sequential animation delays', () => {
    seedTodayEntry()
    renderDashboard()

    const animatedElements = document.querySelectorAll('[class*="animate-widget-enter"]')
    const delays = Array.from(animatedElements).map(
      (el) => (el as HTMLElement).style.animationDelay,
    )

    // First element (hero) should be 0ms
    expect(delays[0]).toBe('0ms')

    // Each subsequent should increment by 100ms
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBe(`${i * 100}ms`)
    }
  })

  it('reduced motion: no animation classes', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    seedTodayEntry()
    renderDashboard()

    const animatedElements = document.querySelectorAll('[class*="animate-widget-enter"]')
    expect(animatedElements.length).toBe(0)
  })

  it('GettingStartedCard shifts stagger indices when present', () => {
    seedTodayEntry()
    // Don't dismiss getting started — it should be visible for new users
    // (useGettingStarted shows it when onboarding is complete but getting_started_complete is not set)
    renderDashboard()

    const animatedElements = document.querySelectorAll('[class*="animate-widget-enter"]')
    const delays = Array.from(animatedElements).map(
      (el) => (el as HTMLElement).style.animationDelay,
    )

    // Hero=0ms, GettingStarted=100ms, then grid cards start at 200ms
    expect(delays[0]).toBe('0ms')
    expect(delays[1]).toBe('100ms')
    // First grid card should be 200ms
    expect(delays[2]).toBe('200ms')
  })

  it('without GettingStartedCard, first grid card delay is 100ms', () => {
    seedTodayEntry()
    // Dismiss getting started
    localStorage.setItem('wr_getting_started_complete', 'true')
    renderDashboard()

    const animatedElements = document.querySelectorAll('[class*="animate-widget-enter"]')
    const delays = Array.from(animatedElements).map(
      (el) => (el as HTMLElement).style.animationDelay,
    )

    // Hero=0ms, then grid cards start at 100ms (no GettingStartedCard)
    expect(delays[0]).toBe('0ms')
    expect(delays[1]).toBe('100ms')
  })

  it('animation does not replay after re-render', () => {
    seedTodayEntry()
    const { rerender } = renderDashboard()

    const initialCount = document.querySelectorAll('[class*="animate-widget-enter"]').length
    expect(initialCount).toBeGreaterThanOrEqual(7)

    // Trigger a full re-render of the same Dashboard tree
    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <AuthModalProvider>
              <Dashboard />
            </AuthModalProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Animation classes should still be present (state persists) but
    // hasAnimatedRef prevents setAnimateEntrance from being called again
    const afterCount = document.querySelectorAll('[class*="animate-widget-enter"]').length
    expect(afterCount).toBe(initialCount)
  })
})
