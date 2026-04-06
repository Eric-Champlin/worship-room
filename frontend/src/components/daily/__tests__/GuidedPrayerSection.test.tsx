import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { GuidedPrayerSection } from '../GuidedPrayerSection'
import { GUIDED_PRAYER_SESSIONS } from '@/data/guided-prayer-sessions'

// --- Mocks ---
const mockAudioDispatch = vi.fn()
const mockLoadScene = vi.fn()

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
  useAudioDispatch: () => mockAudioDispatch,
}))

vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    activeSceneId: null,
    loadScene: mockLoadScene,
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null,
    confirmRoutineInterrupt: vi.fn(),
    cancelRoutineInterrupt: vi.fn(),
  }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: {},
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

// --- Helpers ---

function renderWithProviders(
  onStartSession = vi.fn(),
  authState: 'loggedIn' | 'loggedOut' = 'loggedOut'
) {
  if (authState === 'loggedIn') {
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'TestUser')
  }

  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <GuidedPrayerSection onStartSession={onStartSession} />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('GuidedPrayerSection', () => {
  it('renders section heading without subtitle', () => {
    renderWithProviders()
    expect(screen.getByText('Guided Prayer Sessions')).toBeInTheDocument()
    expect(
      screen.queryByText('Close your eyes and let God lead')
    ).not.toBeInTheDocument()
  })

  it('renders 8 session cards', () => {
    renderWithProviders()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(8)
  })

  it('session cards show correct titles', () => {
    renderWithProviders()
    for (const session of GUIDED_PRAYER_SESSIONS) {
      expect(screen.getByText(session.title)).toBeInTheDocument()
    }
  })

  it('session cards show correct descriptions', () => {
    renderWithProviders()
    for (const session of GUIDED_PRAYER_SESSIONS) {
      expect(screen.getByText(session.description)).toBeInTheDocument()
    }
  })

  it('duration pills show correct values', () => {
    renderWithProviders()
    expect(screen.getAllByText('5 min').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('10 min').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('15 min').length).toBeGreaterThanOrEqual(1)
  })

  it('logged-out user sees all cards', () => {
    renderWithProviders()
    expect(screen.getAllByRole('button')).toHaveLength(8)
  })

  it('logged-out user clicking card triggers auth modal', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    renderWithProviders(onStart, 'loggedOut')

    await user.click(screen.getByText('Morning Offering'))
    // Auth modal should show, onStart should NOT be called
    expect(onStart).not.toHaveBeenCalled()
    expect(
      screen.getByText('Sign in to start a guided prayer session')
    ).toBeInTheDocument()
  })

  it('logged-in user clicking card calls onStartSession', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    renderWithProviders(onStart, 'loggedIn')

    await user.click(screen.getByText('Morning Offering'))
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'morning-offering' })
    )
  })

  it('green checkmarks NOT shown for logged-out users', () => {
    renderWithProviders()
    // No checkmarks should be in the DOM
    const checkmarks = document.querySelectorAll('.text-success')
    expect(checkmarks).toHaveLength(0)
  })

  it('cards have accessible button role', () => {
    renderWithProviders()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(8)
  })

  it('section has correct aria-labelledby', () => {
    renderWithProviders()
    const section = document.querySelector('[aria-labelledby="guided-prayer-heading"]')
    expect(section).toBeInTheDocument()
  })

  it('cards have minimum touch target size via padding', () => {
    renderWithProviders()
    const firstButton = screen.getAllByRole('button')[0]
    // Cards have p-6 (24px) and content, ensuring > 44px height
    expect(firstButton.className).toContain('p-6')
  })
})
