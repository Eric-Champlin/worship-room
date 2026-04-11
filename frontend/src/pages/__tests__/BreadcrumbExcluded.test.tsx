import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-1', name: 'Test' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({
    notifications: [],
    unreadCount: 0,
    markAllAsRead: vi.fn(),
    markAsRead: vi.fn(),
    clearAll: vi.fn(),
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

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
    currentSceneName: null,
    foregroundContent: null,
    sleepTimer: null,
    activeRoutine: null,
  }),
  useAudioDispatch: () => vi.fn(),
  useAudioEngine: () => null,
  useSleepTimerControls: () => ({
    remainingMs: 0,
    totalDurationMs: 0,
    fadeDurationMs: 0,
    phase: null,
    isActive: false,
    isPaused: false,
    fadeStatus: 'none',
    fadeRemainingMs: 0,
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
  }),
}))

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

describe('Breadcrumb excluded pages', () => {
  // BB-38 (verification fix): BibleBrowser.tsx was deleted as an orphan when
  // the Bible redesign moved /bible routing to BibleLanding. The BibleBrowser
  // breadcrumb-exclusion test was removed along with it. BibleLanding and
  // BibleBrowse (the current /bible and /bible/browse pages) also do not
  // render a Breadcrumb component — both intentionally omit breadcrumb
  // navigation on their hero sections.

  it('PrayerWall does not render a breadcrumb', async () => {
    const { PrayerWall } = await import('../PrayerWall')
    render(
      <MemoryRouter
        initialEntries={['/prayer-wall']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ToastProvider>
          <AuthModalProvider>
            <Routes>
              <Route path="/prayer-wall" element={<PrayerWall />} />
            </Routes>
          </AuthModalProvider>
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('navigation', { name: /breadcrumb/i }),
    ).not.toBeInTheDocument()
  })

  it('GrowPage does not render a breadcrumb', async () => {
    const { GrowPage } = await import('../GrowPage')
    render(
      <MemoryRouter
        initialEntries={['/grow']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ToastProvider>
          <AuthModalProvider>
            <Routes>
              <Route path="/grow" element={<GrowPage />} />
            </Routes>
          </AuthModalProvider>
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('navigation', { name: /breadcrumb/i }),
    ).not.toBeInTheDocument()
  })

  it('DailyHub does not render a breadcrumb', async () => {
    const { DailyHub } = await import('../DailyHub')
    render(
      <MemoryRouter
        initialEntries={['/daily']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ToastProvider>
          <AuthModalProvider>
            <Routes>
              <Route path="/daily" element={<DailyHub />} />
            </Routes>
          </AuthModalProvider>
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('navigation', { name: /breadcrumb/i }),
    ).not.toBeInTheDocument()
  })
})
