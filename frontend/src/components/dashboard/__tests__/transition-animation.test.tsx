import { render, screen, act } from '@testing-library/react'
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

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})

// Mock AudioProvider (needed by AmbientSoundPill embedded in tab content components)
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

// Mock useScenePlayer (needed by AmbientSoundPill)
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
  vi.useFakeTimers()
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
})

afterEach(() => {
  vi.useRealTimers()
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

describe('Dashboard Transition Animations', () => {
  it('shows check-in when not checked in today', () => {
    renderDashboard()
    expect(screen.getByText(/How are you feeling today/)).toBeInTheDocument()
  })

  it('shows dashboard directly when already checked in', () => {
    seedTodayEntry()
    renderDashboard()
    // Dashboard should show hero greeting
    expect(screen.getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument()
  })

  it('skips transition when user clicks "Not right now"', async () => {
    renderDashboard()
    expect(screen.getByText(/How are you feeling today/)).toBeInTheDocument()

    const skipButton = screen.getByText('Not right now')
    await act(async () => {
      skipButton.click()
    })

    // Should show dashboard immediately (no transition)
    expect(screen.getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument()
  })

  it('no check-in re-appears after skip', async () => {
    renderDashboard()
    const skipButton = screen.getByText('Not right now')
    await act(async () => {
      skipButton.click()
    })

    // Dashboard is showing, no check-in
    expect(screen.queryByText(/How are you feeling today/)).not.toBeInTheDocument()
  })
})
