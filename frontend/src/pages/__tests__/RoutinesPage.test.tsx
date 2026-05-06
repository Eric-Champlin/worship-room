import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoutinesPage } from '../RoutinesPage'
import { storageService } from '@/services/storage-service'

// ── Mocks ────────────────────────────────────────────────────────────

const mockOpenAuthModal = vi.fn()
const mockStartRoutine = vi.fn()
const mockEndRoutine = vi.fn()
const mockShowToast = vi.fn()

let mockIsAuthenticated = false
let mockActiveRoutine: { routineId: string } | null = null

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: mockIsAuthenticated }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
  useToastSafe: () => ({ showToast: mockShowToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/hooks/useRoutinePlayer', () => ({
  useRoutinePlayer: () => ({
    startRoutine: mockStartRoutine,
    skipStep: vi.fn(),
    endRoutine: mockEndRoutine,
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
    activeRoutine: mockActiveRoutine,
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

// ── Test data ──────────────────────────────────────────────────────────

const USER_ROUTINE = {
  id: 'user-routine-1',
  name: 'Test Routine',
  isTemplate: false,
  steps: [{ id: 'step-1', type: 'scene' as const, contentId: 'rain', transitionGapMinutes: 0 }],
  sleepTimer: { durationMinutes: 45, fadeDurationMinutes: 15 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

// ── Helpers ────────────────────────────────────────────────────────────

const renderPage = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RoutinesPage />
    </MemoryRouter>,
  )

const openDeleteDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  const cards = screen.getAllByRole('article')
  const userRoutineCard = cards.find((card) => card.textContent?.includes('Test Routine'))!
  const kebabBtn = userRoutineCard.querySelector('[aria-label="Routine options"]') as HTMLElement
  await user.click(kebabBtn)
  await user.click(screen.getByRole('menuitem', { name: /^Delete$/ }))
}

const confirmDelete = async (user: ReturnType<typeof userEvent.setup>) => {
  const dialog = screen.getByRole('alertdialog')
  await user.click(within(dialog).getByRole('button', { name: /^Delete$/ }))
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('RoutinesPage', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    mockActiveRoutine = null
    vi.clearAllMocks()
    vi.mocked(storageService.getRoutines).mockReturnValue([])
  })

  // ── Existing baseline tests ──────────────────────────────────────────

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

  // ── Step 1: font-script removal ──────────────────────────────────────

  it('h1 does not contain a font-script span', () => {
    renderPage()
    const h1 = screen.getByRole('heading', { name: /Bedtime Routines/i })
    expect(h1.querySelector('.font-script')).toBeNull()
  })

  it('h1 text content is exactly "Bedtime Routines"', () => {
    renderPage()
    const h1 = screen.getByRole('heading', { name: /Bedtime Routines/i })
    expect(h1.textContent).toBe('Bedtime Routines')
  })

  // ── Step 2: subtitle font-serif italic removal ────────────────────────

  it('subtitle does not have font-serif class', () => {
    renderPage()
    const subtitle = screen.getByText(/Build your path to peaceful sleep/i)
    expect(subtitle.className).not.toContain('font-serif')
  })

  it('subtitle does not have italic class', () => {
    renderPage()
    const subtitle = screen.getByText(/Build your path to peaceful sleep/i)
    expect(subtitle.className).not.toContain('italic')
  })

  // ── Step 3: Create Routine CTA → white-pill Pattern 2 ────────────────

  it('Create Routine CTA uses white-pill Pattern 2 chrome', () => {
    renderPage()
    const btn = screen.getByRole('button', { name: /Create Routine/i })
    expect(btn.className).toContain('bg-white')
    expect(btn.className).toContain('rounded-full')
    expect(btn.className).toContain('min-h-[44px]')
    expect(btn.className).toContain('text-hero-bg')
    expect(btn.className).toContain('shadow-[0_0_30px_rgba(255,255,255,0.20)]')
  })

  it('Create Routine CTA does NOT have bg-primary', () => {
    renderPage()
    const btn = screen.getByRole('button', { name: /Create Routine/i })
    expect(btn.className).not.toContain('bg-primary')
  })

  // ── Step 4: empty-state hint paragraph ───────────────────────────────

  it('hint paragraph renders with verbatim copy', () => {
    renderPage()
    expect(
      screen.getByText('Tap a template to start, or create your own.'),
    ).toBeInTheDocument()
  })

  it('hint paragraph has canonical secondary-text styling', () => {
    renderPage()
    const hint = screen.getByText('Tap a template to start, or create your own.')
    expect(hint.className).toContain('text-white/60')
    expect(hint.className).toContain('text-center')
  })

  it('hint paragraph is hidden when RoutineBuilder is mounted', async () => {
    mockIsAuthenticated = true
    const user = userEvent.setup()
    renderPage()

    expect(
      screen.getByText('Tap a template to start, or create your own.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Create Routine/i }))

    expect(
      screen.queryByText('Tap a template to start, or create your own.'),
    ).not.toBeInTheDocument()
  })

  // ── Step 5: handleDelete active-routine cleanup ───────────────────────

  describe('handleDelete — active-routine cleanup', () => {
    const setupUserRoutine = () => {
      vi.mocked(storageService.getRoutines).mockReturnValue([USER_ROUTINE])
    }

    it('calls endRoutine when deleted routine is the active routine', async () => {
      mockIsAuthenticated = true
      mockActiveRoutine = { routineId: 'user-routine-1' }
      setupUserRoutine()
      const user = userEvent.setup()
      renderPage()

      await openDeleteDialog(user)
      await confirmDelete(user)

      expect(mockEndRoutine).toHaveBeenCalledOnce()
      expect(vi.mocked(storageService.deleteRoutine)).toHaveBeenCalledWith('user-routine-1')
    })

    it('does NOT call endRoutine when active routine differs', async () => {
      mockIsAuthenticated = true
      mockActiveRoutine = { routineId: 'some-other-routine' }
      setupUserRoutine()
      const user = userEvent.setup()
      renderPage()

      await openDeleteDialog(user)
      await confirmDelete(user)

      expect(mockEndRoutine).not.toHaveBeenCalled()
      expect(vi.mocked(storageService.deleteRoutine)).toHaveBeenCalledWith('user-routine-1')
    })

    it('does NOT call endRoutine when no active routine', async () => {
      mockIsAuthenticated = true
      // mockActiveRoutine is already null from beforeEach
      setupUserRoutine()
      const user = userEvent.setup()
      renderPage()

      await openDeleteDialog(user)
      await confirmDelete(user)

      expect(mockEndRoutine).not.toHaveBeenCalled()
      expect(vi.mocked(storageService.deleteRoutine)).toHaveBeenCalledWith('user-routine-1')
    })

    it('shows toast and closes dialog on delete (matching active routine)', async () => {
      mockIsAuthenticated = true
      mockActiveRoutine = { routineId: 'user-routine-1' }
      setupUserRoutine()
      const user = userEvent.setup()
      renderPage()

      await openDeleteDialog(user)
      await confirmDelete(user)

      expect(mockShowToast).toHaveBeenCalledWith('Deleted "Test Routine"')
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('shows toast and closes dialog on delete (non-active routine)', async () => {
      mockIsAuthenticated = true
      // mockActiveRoutine is null
      setupUserRoutine()
      const user = userEvent.setup()
      renderPage()

      await openDeleteDialog(user)
      await confirmDelete(user)

      expect(mockShowToast).toHaveBeenCalledWith('Deleted "Test Routine"')
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('endRoutine called before deleteRoutine (order of operations)', async () => {
      mockIsAuthenticated = true
      mockActiveRoutine = { routineId: 'user-routine-1' }
      setupUserRoutine()
      const user = userEvent.setup()
      renderPage()

      await openDeleteDialog(user)
      await confirmDelete(user)

      const endOrder = mockEndRoutine.mock.invocationCallOrder[0]
      const deleteOrder = vi.mocked(storageService.deleteRoutine).mock.invocationCallOrder[0]
      expect(endOrder).toBeLessThan(deleteOrder)
    })
  })
})
