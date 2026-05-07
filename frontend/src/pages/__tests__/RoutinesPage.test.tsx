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
let mockUserName: string | null = null

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUserName ? { name: mockUserName } : null,
    isAuthenticated: mockIsAuthenticated,
  }),
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
    // Step 10 favorites methods (Spec 11c)
    getRoutineFavorites: vi.fn().mockReturnValue([]),
    toggleRoutineFavorite: vi.fn(),
    isRoutineFavorited: vi.fn().mockReturnValue(false),
  },
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
    mockUserName = null
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

  it('shows "End your day in stillness." subtitle', () => {
    renderPage()
    expect(
      screen.getByText(/End your day in stillness\./i),
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
    const subtitle = screen.getByText(/End your day in stillness\./i)
    expect(subtitle.className).not.toContain('font-serif')
  })

  it('subtitle does not have italic class', () => {
    renderPage()
    const subtitle = screen.getByText(/End your day in stillness\./i)
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

  // ── Patch 1: HeadingDivider removal ──────────────────────────────────

  it('hero does not render a HeadingDivider SVG', () => {
    renderPage()
    const heading = screen.getByRole('heading', { name: /Bedtime Routines/i })
    const heroSection = heading.closest('section')
    // HeadingDivider's signature: SVG with linearGradient defs + <circle> dots.
    // (Lucide icons like ArrowLeft also use SVG/viewBox but are path-only, no
    // gradients or circles.)
    const dividerSvgs = Array.from(
      heroSection?.querySelectorAll('svg') ?? [],
    ).filter(
      (svg) =>
        svg.querySelector('linearGradient') !== null &&
        svg.querySelector('circle') !== null,
    )
    expect(dividerSvgs.length).toBe(0)
  })

  // ── Patch 2: conditional empty-state hint copy ───────────────────────

  it('hint copy renders when user has zero saved routines', () => {
    vi.mocked(storageService.getRoutines).mockReturnValue([])
    renderPage()
    expect(
      screen.getByText('Tap a template to start, or create your own.'),
    ).toBeInTheDocument()
  })

  it('hint copy is hidden when user has 1+ saved routines', () => {
    vi.mocked(storageService.getRoutines).mockReturnValue([USER_ROUTINE])
    renderPage()
    expect(
      screen.queryByText('Tap a template to start, or create your own.'),
    ).not.toBeInTheDocument()
  })

  // ── Patch 3: hero back-navigation link to /music ─────────────────────

  it('hero renders a "Music" back-nav link to /music', () => {
    renderPage()
    const heading = screen.getByRole('heading', { name: /Bedtime Routines/i })
    const heroSection = heading.closest('section')!
    const link = within(heroSection).getByRole('link', { name: /Music/i })
    expect(link).toHaveAttribute('href', '/music')
    expect(link.className).toContain('text-white/50')
    expect(link.className).toContain('hover:text-white/70')
  })

  // ── Patch 6: section eyebrows toggle on user-routines presence ───────

  it('renders no section eyebrows when user has zero saved routines', () => {
    vi.mocked(storageService.getRoutines).mockReturnValue([])
    renderPage()
    expect(
      screen.queryByRole('heading', { level: 2, name: /^Templates$/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 2, name: /^Your routines$/ }),
    ).not.toBeInTheDocument()
  })

  it('renders both section eyebrows when user has 1+ saved routines', () => {
    vi.mocked(storageService.getRoutines).mockReturnValue([USER_ROUTINE])
    renderPage()
    expect(
      screen.getByRole('heading', { level: 2, name: /^Templates$/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: /^Your routines$/ }),
    ).toBeInTheDocument()
  })

  it('section eyebrows use canonical class chrome', () => {
    vi.mocked(storageService.getRoutines).mockReturnValue([USER_ROUTINE])
    renderPage()
    const templatesEyebrow = screen.getByRole('heading', {
      level: 2,
      name: /^Templates$/,
    })
    expect(templatesEyebrow.className).toContain('text-xs')
    expect(templatesEyebrow.className).toContain('text-white/60')
    expect(templatesEyebrow.className).toContain('uppercase')
    expect(templatesEyebrow.className).toContain('tracking-wider')
  })

  // ── Spec 11c Step 1: Hero starfield + a11y ──────────────────────────

  it('hero section has aria-labelledby attribute', () => {
    const { container } = renderPage()
    const heroSection = container.querySelector('section[aria-labelledby="routines-heading"]')
    expect(heroSection).not.toBeNull()
  })

  it('h1 has id="routines-heading"', () => {
    renderPage()
    const h1 = screen.getByRole('heading', { level: 1, name: /Bedtime Routines/i })
    expect(h1.id).toBe('routines-heading')
  })

  it('starfield overlay renders with aria-hidden and pointer-events-none inside hero', () => {
    const { container } = renderPage()
    const heroSection = container.querySelector('section[aria-labelledby="routines-heading"]')!
    const starfield = heroSection.querySelector('div[aria-hidden="true"][class*="pointer-events-none"][class*="absolute"]')
    expect(starfield).not.toBeNull()
  })

  // ── Spec 11c Step 2: Adaptive greeting ──────────────────────────────

  it('greeting renders "Your bedtime sanctuary." when logged out', () => {
    mockIsAuthenticated = false
    renderPage()
    expect(screen.getByText('Your bedtime sanctuary.')).toBeInTheDocument()
  })

  it('greeting renders "Welcome back, {name}." when logged in with at least one routine', () => {
    mockIsAuthenticated = true
    mockUserName = 'Eric'
    vi.mocked(storageService.getRoutines).mockReturnValue([USER_ROUTINE])
    renderPage()
    expect(screen.getByText('Welcome back, Eric.')).toBeInTheDocument()
  })

  it('greeting renders "Your bedtime sanctuary." when logged in with zero routines', () => {
    mockIsAuthenticated = true
    mockUserName = 'Eric'
    vi.mocked(storageService.getRoutines).mockReturnValue([])
    renderPage()
    expect(screen.getByText('Your bedtime sanctuary.')).toBeInTheDocument()
  })

  it('greeting renders "Currently winding down." when active routine (takes precedence)', () => {
    mockActiveRoutine = { routineId: 'x' }
    renderPage()
    expect(screen.getByText('Currently winding down.')).toBeInTheDocument()
  })

  // ── Spec 11c Step 4: "Your routines" eyebrow promotion ──────────────

  it('Templates eyebrow stays muted (text-white/60, no text-violet-300)', () => {
    vi.mocked(storageService.getRoutines).mockReturnValue([USER_ROUTINE])
    renderPage()
    const templatesH2 = screen.getByRole('heading', { level: 2, name: /^Templates$/ })
    expect(templatesH2.className).toContain('text-white/60')
    expect(templatesH2.className).not.toContain('text-violet-300')
  })

  it('"Your routines" eyebrow has violet leading dot (aria-hidden)', () => {
    vi.mocked(storageService.getRoutines).mockReturnValue([USER_ROUTINE])
    renderPage()
    const yourRoutinesH2 = screen.getByRole('heading', { level: 2, name: /^Your routines$/ })
    const dot = yourRoutinesH2.querySelector('span[aria-hidden="true"][class*="bg-violet-400"]')
    expect(dot).not.toBeNull()
  })

  it('"Your routines" eyebrow uses violet text + tighter tracking', () => {
    vi.mocked(storageService.getRoutines).mockReturnValue([USER_ROUTINE])
    renderPage()
    const yourRoutinesH2 = screen.getByRole('heading', { level: 2, name: /^Your routines$/ })
    expect(yourRoutinesH2.className).toContain('text-violet-300')
    expect(yourRoutinesH2.className).toContain('tracking-[0.15em]')
    expect(yourRoutinesH2.className).toContain('font-semibold')
  })

  it('empty state suppresses both eyebrows', () => {
    vi.mocked(storageService.getRoutines).mockReturnValue([])
    renderPage()
    expect(screen.queryByRole('heading', { level: 2, name: /^Templates$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: /^Your routines$/ })).not.toBeInTheDocument()
  })

  // ── Spec 11c Step 5: isActive prop + "Now playing" chip ─────────────

  it('active routine card receives isActive=true (shows "Now playing" chip)', () => {
    mockActiveRoutine = { routineId: 'template-evening-peace' }
    renderPage()
    // The Evening Peace template card should show "Now playing"
    const cards = screen.getAllByRole('article')
    const eveningPeaceCard = cards.find((c) => c.textContent?.includes('Evening Peace'))!
    expect(within(eveningPeaceCard).getByText('Now playing')).toBeInTheDocument()
  })

  it('non-active routines do NOT show "Now playing" chip', () => {
    mockActiveRoutine = { routineId: 'template-evening-peace' }
    renderPage()
    const cards = screen.getAllByRole('article')
    // Scripture & Sleep card (not active) should NOT have Now playing
    const otherCard = cards.find((c) => c.textContent?.includes('Scripture & Sleep'))!
    expect(within(otherCard).queryByText('Now playing')).not.toBeInTheDocument()
  })
})
