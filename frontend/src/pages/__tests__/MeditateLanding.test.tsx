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

function renderComponent(locationState?: Record<string, unknown>) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/daily', search: '?tab=meditate', state: locationState }]}
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
  it('renders gradient heading text', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { name: /what's on your spirit\?/i })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveStyle({ backgroundImage: expect.stringContaining('linear-gradient') })
  })

  it('heading has no Caveat script font span', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { name: /what's on your spirit\?/i })
    const scriptSpan = heading.querySelector('.font-script')
    expect(scriptSpan).toBeNull()
  })

  it('renders glow background with split variant', () => {
    renderComponent()
    const orbs = screen.getAllByTestId('glow-orb')
    expect(orbs.length).toBeGreaterThanOrEqual(2)
  })

  it('standard card has frosted glass classes', () => {
    renderComponent()
    const card = screen.getByText('Breathing Exercise').closest('button')!
    expect(card.className).toContain('bg-white/[0.06]')
    expect(card.className).toContain('border-white/[0.12]')
    expect(card.className).toContain('shadow-[')
  })

  it('standard card has hover lift classes', () => {
    renderComponent()
    const card = screen.getByText('Breathing Exercise').closest('button')!
    expect(card.className).toContain('hover:-translate-y-0.5')
    expect(card.className).toContain('motion-reduce:hover:translate-y-0')
  })

  it('focus ring uses hero-bg offset', () => {
    renderComponent()
    const card = screen.getByText('Breathing Exercise').closest('button')!
    expect(card.className).toContain('ring-offset-hero-bg')
    expect(card.className).not.toContain('ring-offset-dashboard-dark')
  })

  it('suggested card has enhanced shadow', () => {
    // 'pray' action type maps to '/meditate/acts' which is the ACTS Prayer Walk card
    renderComponent({ challengeContext: { actionType: 'pray', dayTitle: 'Test Day' } })
    const suggestedCard = screen.getByText('ACTS Prayer Walk').closest('button')!
    expect(suggestedCard.className).toContain('border-primary')
    expect(suggestedCard.className).toContain('shadow-[0_0_30px_rgba(139,92,246,0.12)')
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

  it('ambient sound pill renders inline with heading (same flex container)', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { name: /what's on your spirit\?/i })
    const pillButton = screen.getByLabelText(/enhance with sound/i)
    const headingParent = heading.parentElement
    expect(headingParent).not.toBeNull()
    expect(headingParent!.contains(pillButton)).toBe(true)
  })

  it('heading flex container has responsive inline classes', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { name: /what's on your spirit\?/i })
    const container = heading.parentElement!
    expect(container.className).toContain('flex')
    expect(container.className).toContain('flex-col')
    expect(container.className).toContain('items-center')
    expect(container.className).toContain('gap-3')
    expect(container.className).toContain('sm:flex-row')
    expect(container.className).toContain('sm:gap-4')
  })

  it('heading does not have text-center (flex parent handles centering)', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { name: /what's on your spirit\?/i })
    expect(heading.className).not.toContain('text-center')
  })
})
