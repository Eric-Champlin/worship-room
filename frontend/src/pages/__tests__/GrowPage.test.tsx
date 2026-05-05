import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { GrowPage } from '../GrowPage'

const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', async () => {
  const actual = await vi.importActual<
    typeof import('@/components/prayer-wall/AuthModalProvider')
  >('@/components/prayer-wall/AuthModalProvider')
  return {
    ...actual,
    useAuthModal: () => ({ openAuthModal: vi.fn() }),
  }
})

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

const mockActiveChallengeInfo = vi.fn()

vi.mock('@/lib/challenge-calendar', async () => {
  const actual = await vi.importActual<typeof import('@/lib/challenge-calendar')>(
    '@/lib/challenge-calendar',
  )
  return {
    ...actual,
    getActiveChallengeInfo: (...args: unknown[]) => mockActiveChallengeInfo(...args),
  }
})

function renderPage(initialEntry = '/grow') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <GrowPage />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('GrowPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
    mockActiveChallengeInfo.mockReturnValue(null)
  })

  // --- Rendering ---

  it('renders hero with "Grow in Faith" title', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Grow in Faith', level: 1 }),
    ).toBeInTheDocument()
  })

  it('hero h1 does not contain font-script class', () => {
    renderPage()
    const h1 = screen.getByRole('heading', { name: 'Grow in Faith', level: 1 })
    expect(h1.querySelector('.font-script')).toBeNull()
    expect(h1.textContent).toBe('Grow in Faith')
  })

  it('renders hero subtitle', () => {
    renderPage()
    expect(
      screen.getByText('Structured journeys to deepen your walk with God'),
    ).toBeInTheDocument()
  })

  it('renders two tab buttons', () => {
    renderPage()
    expect(screen.getByRole('tab', { name: /Reading Plans/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Challenges/ })).toBeInTheDocument()
  })

  // --- Tab Navigation ---

  it('defaults to Reading Plans tab when no tab param', () => {
    renderPage('/grow')
    expect(screen.getByRole('tab', { name: /Reading Plans/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Create Your Own Plan')).toBeInTheDocument()
  })

  it('shows Reading Plans content for ?tab=plans', () => {
    renderPage('/grow?tab=plans')
    expect(screen.getByRole('tab', { name: /Reading Plans/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Create Your Own Plan')).toBeInTheDocument()
  })

  it('shows Challenges content for ?tab=challenges', () => {
    renderPage('/grow?tab=challenges')
    expect(screen.getByRole('tab', { name: /Challenges/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // Challenges section should be visible (not hidden)
    const challengesPanel = screen.getByRole('tabpanel', { name: /Challenges/ })
    expect(challengesPanel).not.toHaveAttribute('hidden')
  })

  it('invalid tab param defaults to Reading Plans', () => {
    renderPage('/grow?tab=invalid')
    expect(screen.getByRole('tab', { name: /Reading Plans/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('tab click switches visible content', async () => {
    const user = userEvent.setup()
    renderPage('/grow?tab=plans')

    const challengesTab = screen.getByRole('tab', { name: /Challenges/ })
    await user.click(challengesTab)

    expect(challengesTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Reading Plans/ })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  // --- State Preservation ---

  it('both tab panels are in the DOM (mounted, one hidden)', () => {
    renderPage('/grow?tab=plans')
    const plansPanel = document.getElementById('tabpanel-plans')
    const challengesPanel = document.getElementById('tabpanel-challenges')
    expect(plansPanel).toBeInTheDocument()
    expect(challengesPanel).toBeInTheDocument()
    expect(challengesPanel).toHaveAttribute('hidden')
    expect(plansPanel).not.toHaveAttribute('hidden')
  })

  // --- Challenge Notification Dot ---

  it('shows pulsing dot on Challenges tab when active challenge exists', () => {
    mockActiveChallengeInfo.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      daysRemaining: 10,
      calendarDay: 30,
    })
    renderPage()
    const challengesTab = screen.getByRole('tab', { name: /Challenges/ })
    const dot = challengesTab.querySelector('span[aria-hidden="true"]')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass('rounded-full')
  })

  it('no dot when no active challenge', () => {
    mockActiveChallengeInfo.mockReturnValue(null)
    renderPage()
    const challengesTab = screen.getByRole('tab', { name: /Challenges/ })
    // Only the icon SVG should have aria-hidden, no span dot
    const dot = challengesTab.querySelector('span[aria-hidden="true"]')
    expect(dot).toBeNull()
  })

  // --- CreatePlanFlow ---

  it('?create=true with plans tab triggers CreatePlanFlow', () => {
    mockAuth.isAuthenticated = true
    renderPage('/grow?tab=plans&create=true')
    expect(screen.getByText("What's on your heart?")).toBeInTheDocument()
  })

  // --- Accessibility ---

  it('tab bar has role="tablist"', () => {
    renderPage()
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('tablist has aria-label', () => {
    renderPage()
    expect(screen.getByRole('tablist')).toHaveAttribute(
      'aria-label',
      'Grow in Faith sections',
    )
  })

  it('active tab has aria-selected="true" and inactive has "false"', () => {
    renderPage('/grow?tab=plans')
    expect(screen.getByRole('tab', { name: /Reading Plans/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: /Challenges/ })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('inactive tab has tabIndex={-1}', () => {
    renderPage('/grow?tab=plans')
    expect(screen.getByRole('tab', { name: /Challenges/ })).toHaveAttribute(
      'tabindex',
      '-1',
    )
  })

  it('tab panels have correct role and aria-labelledby', () => {
    renderPage()
    const plansPanel = screen.getByRole('tabpanel', { name: /Reading Plans/ })
    expect(plansPanel).toHaveAttribute('aria-labelledby', 'tab-plans')
    const challengesPanel = document.getElementById('tabpanel-challenges')
    expect(challengesPanel).toHaveAttribute('role', 'tabpanel')
    expect(challengesPanel).toHaveAttribute('aria-labelledby', 'tab-challenges')
  })

  it('arrow key navigation moves focus between tabs', async () => {
    const user = userEvent.setup()
    renderPage('/grow?tab=plans')

    const plansTab = screen.getByRole('tab', { name: /Reading Plans/ })
    plansTab.focus()
    await user.keyboard('{ArrowRight}')

    const challengesTab = screen.getByRole('tab', { name: /Challenges/ })
    expect(challengesTab).toHaveFocus()
    expect(challengesTab).toHaveAttribute('aria-selected', 'true')
  })

  // --- Auth Gating (inherited) ---

  it('logged-out user can view both tabs', () => {
    mockAuth.isAuthenticated = false
    renderPage('/grow')
    expect(screen.getByText('Create Your Own Plan')).toBeInTheDocument()
    // Both panels exist in DOM
    expect(document.getElementById('tabpanel-challenges')).toBeInTheDocument()
  })

  // --- Spec 6A Step 1: BackgroundCanvas wrap ---

  it('renders BackgroundCanvas wrapping below-hero content', () => {
    const { container } = renderPage()
    // BackgroundCanvas signature: relative + min-h-screen + overflow-hidden
    const canvas = container.querySelector('.relative.min-h-screen.overflow-hidden')
    expect(canvas).toBeInTheDocument()
    // BackgroundCanvas should contain the sticky tab bar wrapper and tabpanels
    expect(canvas?.querySelector('[role="tablist"]')).toBeInTheDocument()
    expect(canvas?.querySelector('#tabpanel-plans')).toBeInTheDocument()
    expect(canvas?.querySelector('#tabpanel-challenges')).toBeInTheDocument()
    // Hero section should NOT be inside BackgroundCanvas
    const heroSection = container.querySelector('section[aria-labelledby="grow-heading"]')
    expect(heroSection).toBeInTheDocument()
    expect(canvas?.contains(heroSection)).toBe(false)
  })

  // --- Spec 6A Step 2: Hero subtitle plain prose ---

  it('hero subtitle is plain prose, no italic', () => {
    renderPage()
    const subtitle = screen.getByText('Structured journeys to deepen your walk with God')
    expect(subtitle.className).not.toContain('font-serif')
    expect(subtitle.className).not.toContain('italic')
  })

  it('hero subtitle uses text-white/70 with leading-relaxed', () => {
    renderPage()
    const subtitle = screen.getByText('Structured journeys to deepen your walk with God')
    expect(subtitle.className).toContain('text-white/70')
    expect(subtitle.className).toContain('leading-relaxed')
    expect(subtitle.className).toContain('text-base')
    expect(subtitle.className).toContain('sm:text-lg')
    expect(subtitle.className).toContain('mt-2')
  })

  // --- Spec 6A Step 3: Sticky tab bar tint ---

  it('sticky tab bar wrapper has bg-hero-bg/70 + duration-base', () => {
    const { container } = renderPage()
    const stickyWrapper = container.querySelector('.sticky.top-0.z-40')
    expect(stickyWrapper).toBeInTheDocument()
    expect(stickyWrapper?.className).toContain('bg-hero-bg/70')
    expect(stickyWrapper?.className).toContain('duration-base')
    expect(stickyWrapper?.className).toContain('transition-shadow')
    expect(stickyWrapper?.className).toContain('motion-reduce:transition-none')
    expect(stickyWrapper?.className).toContain('backdrop-blur-md')
  })

  // --- Spec 6A Step 4: Tab icon tonal colors ---

  it('Plans tab BookOpen icon has text-sky-300', () => {
    renderPage()
    const plansTab = screen.getByRole('tab', { name: /Reading Plans/ })
    const icon = plansTab.querySelector('svg')
    expect(icon?.classList.contains('text-sky-300')).toBe(true)
  })

  it('Challenges tab Flame icon has text-amber-300', () => {
    renderPage()
    const challengesTab = screen.getByRole('tab', { name: /Challenges/ })
    const icon = challengesTab.querySelector('svg')
    expect(icon?.classList.contains('text-amber-300')).toBe(true)
  })
})
