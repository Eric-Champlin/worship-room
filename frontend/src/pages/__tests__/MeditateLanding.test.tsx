import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { MeditateTabContent } from '@/components/daily/MeditateTabContent'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: true })),
}))

// Mock AudioProvider (needed by AmbientSoundPill embedded in MeditateTabContent)
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

const { useAuth } = await import('@/hooks/useAuth')
const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  mockNavigate.mockReset()
  mockUseAuth.mockReturnValue({ user: null, isAuthenticated: true, login: vi.fn(), logout: vi.fn() })
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

function renderComponent() {
  return render(
    <MemoryRouter
      initialEntries={['/daily?tab=meditate']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <MeditateTabContent />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('MeditateTabContent', () => {
  it('renders styled heading with "Spirit?"', () => {
    renderComponent()
    expect(screen.getByText('Spirit?')).toBeInTheDocument()
    expect(screen.getByText(/what's on your/i)).toBeInTheDocument()
  })

  it('renders 6 meditation cards', () => {
    renderComponent()
    expect(screen.getByText('Breathing Exercise')).toBeInTheDocument()
    expect(screen.getByText('Scripture Soaking')).toBeInTheDocument()
    expect(screen.getByText('Gratitude Reflection')).toBeInTheDocument()
    expect(screen.getByText('ACTS Prayer Walk')).toBeInTheDocument()
    expect(screen.getByText('Psalm Reading')).toBeInTheDocument()
    expect(screen.getByText('Examen')).toBeInTheDocument()
  })

  it('logged-in user clicking card navigates to route', async () => {
    const user = userEvent.setup()
    renderComponent()
    await user.click(screen.getByText('Breathing Exercise'))
    expect(mockNavigate).toHaveBeenCalledWith('/meditate/breathing')
  })

  it('logged-out user clicking card opens auth modal', async () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
    const user = userEvent.setup()
    renderComponent()
    await user.click(screen.getByText('Breathing Exercise'))

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByText('Sign in to start meditating'),
    ).toBeInTheDocument()
  })

  it('does not show all-6-complete celebration when none completed', () => {
    renderComponent()
    expect(
      screen.queryByText(/you completed all 6 meditations/i),
    ).not.toBeInTheDocument()
  })

  it('does not show checkmarks when logged out', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
    renderComponent()
    const checkmarks = screen.queryAllByText(/completed/i)
    expect(checkmarks).toHaveLength(0)
  })
})
