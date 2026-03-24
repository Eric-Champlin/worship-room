import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoutinesPage } from '../RoutinesPage'

// ── Mocks ────────────────────────────────────────────────────────────

const mockOpenAuthModal = vi.fn()
const mockStartRoutine = vi.fn()
const mockShowToast = vi.fn()

let mockIsAuthenticated = false

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: mockIsAuthenticated }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/hooks/useRoutinePlayer', () => ({
  useRoutinePlayer: () => ({
    startRoutine: mockStartRoutine,
    skipStep: vi.fn(),
    endRoutine: vi.fn(),
    pendingInterrupt: null,
    confirmInterrupt: vi.fn(),
    cancelInterrupt: vi.fn(),
    isRoutineActive: false,
  }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: null,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: null,
    currentSceneName: null,
    currentSceneId: null,
  }),
  useAudioDispatch: () => vi.fn(),
  useAudioEngine: () => null,
}))

vi.mock('@/services/storage-service', () => ({
  storageService: {
    getRoutines: vi.fn().mockReturnValue([]),
    saveRoutine: vi.fn(),
    updateRoutine: vi.fn(),
    deleteRoutine: vi.fn(),
    duplicateRoutine: vi.fn(),
    logListeningSession: vi.fn(),
  },
}))

vi.mock('@/hooks/useElementWidth', () => ({
  useElementWidth: () => ({ ref: { current: null }, width: 300 }),
}))

const renderPage = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RoutinesPage />
    </MemoryRouter>,
  )

describe('RoutinesPage', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    vi.clearAllMocks()
  })

  it('renders hero with "Bedtime Routines" heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: /Bedtime Routines/i }),
    ).toBeInTheDocument()
  })

  it('renders 4 templates when no user routines', () => {
    renderPage()
    expect(screen.getByText('Evening Peace')).toBeInTheDocument()
    expect(screen.getByText('Scripture & Sleep')).toBeInTheDocument()
    expect(screen.getByText('Deep Rest')).toBeInTheDocument()
    expect(screen.getByText('Bible Before Bed')).toBeInTheDocument()
  })

  it('all templates show Template badge', () => {
    renderPage()
    const badges = screen.getAllByText('Template')
    expect(badges).toHaveLength(4)
  })

  it('Start button shows auth modal when logged out', async () => {
    const user = userEvent.setup()
    renderPage()

    // Get all Start buttons within routine cards (exclude navbar buttons)
    const routineCards = screen.getAllByRole('article')
    const startButton = routineCards[0].querySelector('button')!
    await user.click(startButton)

    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to use bedtime routines',
    )
  })

  it('Create Routine button shows auth modal when logged out', async () => {
    const user = userEvent.setup()
    renderPage()

    const createBtn = screen.getByRole('button', { name: /Create Routine/i })
    await user.click(createBtn)

    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to create bedtime routines',
    )
  })

  it('template cards have Clone, not Edit/Delete', async () => {
    const user = userEvent.setup()
    renderPage()

    // Open the first template's menu
    const menuButtons = screen.getAllByRole('button', {
      name: /routine options/i,
    })
    await user.click(menuButtons[0])

    expect(screen.getByText('Clone & Customize')).toBeInTheDocument()
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('shows "Build your path to peaceful sleep" subtitle', () => {
    renderPage()
    expect(
      screen.getByText(/Build your path to peaceful sleep/i),
    ).toBeInTheDocument()
  })
})
