import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { DailyHub } from '../DailyHub'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false })),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
}))

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

import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
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

function renderPage(initialEntry = '/daily') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
      <AuthModalProvider>
      <DailyHub />
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('DailyHub', () => {
  it('renders a time-aware greeting with correct capitalization', () => {
    renderPage()
    const greeting = screen.getByText(/Good (Morning|Afternoon|Evening)/)
    expect(greeting).toBeInTheDocument()
  })

  it('greeting heading uses gradient text style, not Caveat font', () => {
    renderPage()
    const heading = screen.getByRole('heading', { level: 1 })
    // No Caveat font class
    expect(heading.className).not.toContain('font-script')
    // GRADIENT_TEXT_STYLE applies inline backgroundImage
    expect(heading.style.backgroundImage).toContain('linear-gradient')
    // backgroundClip is set via both standard and webkit-prefixed properties
    expect(heading.style.backgroundClip).toBe('text')
  })

  it('does not render the old subtitle', () => {
    renderPage()
    expect(screen.queryByText(/start with any practice below/i)).not.toBeInTheDocument()
  })

  it('devotional card is not rendered in hero', () => {
    renderPage()
    const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
    expect(hero.textContent).not.toMatch(/Daily Devotional/i)
    expect(hero.textContent).not.toMatch(/Read today/i)
  })

  it('does NOT render ChallengeStrip', () => {
    renderPage()
    // ChallengeStrip would render challenge-related content between hero and tabs
    expect(screen.queryByText(/day challenge/i)).not.toBeInTheDocument()
  })

  describe('Hero minimalism', () => {
    it('hero contains only the greeting heading — no verse card', () => {
      renderPage()
      const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
      // No FrostedCard classes in hero
      expect(hero.querySelector('.bg-white\\/\\[0\\.06\\]')).toBeNull()
      // No verse text (serif italic)
      expect(hero.querySelector('.font-serif.italic')).toBeNull()
      // No share button
      expect(hero.querySelector('[aria-label="Share verse of the day"]')).toBeNull()
      // Only the greeting heading
      const heading = hero.querySelector('h1')
      expect(heading).toBeInTheDocument()
    })

    it('hero bottom padding is pb-12 sm:pb-16', () => {
      renderPage()
      const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
      expect(hero.className).toContain('pb-12')
      expect(hero.className).toContain('sm:pb-16')
      // Old values removed
      expect(hero.className).not.toContain('pb-8')
      expect(hero.className).not.toMatch(/\bsm:pb-12\b/)
    })

    it('hero has no SharePanel', () => {
      renderPage()
      const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
      // No share-related buttons or modals in hero
      expect(hero.querySelectorAll('button').length).toBe(0)
    })
  })

  it('tab bar still functions after hero redesign', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('tab', { name: /journal/i }))
    expect(screen.getByRole('heading', { name: /what's on your mind\?/i })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /meditate/i }))
    expect(screen.getByText('Breathing Exercise')).toBeInTheDocument()
  })

  it('renders tab bar with 4 tabs', () => {
    renderPage()
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(4)
    expect(tabs[0]).toHaveTextContent(/devos|devotional/i)
    expect(tabs[1]).toHaveTextContent('Pray')
    expect(tabs[2]).toHaveTextContent('Journal')
    expect(tabs[3]).toHaveTextContent('Meditate')
  })

  it('defaults to Devotional tab content', () => {
    renderPage()
    // "Ready to pray about today's reading?" text uniquely identifies the devotional tab content
    expect(screen.getByText("Ready to pray about today's reading?")).toBeInTheDocument()
    const devTab = screen.getByRole('tab', { name: /devos|devotional/i })
    expect(devTab).toHaveAttribute('aria-selected', 'true')
  })

  it('shows Journal tab content when ?tab=journal', () => {
    renderPage('/daily?tab=journal')
    expect(
      screen.getByRole('heading', { name: /what's on your mind\?/i }),
    ).toBeInTheDocument()
  })

  it('shows Meditate tab content when ?tab=meditate', () => {
    renderPage('/daily?tab=meditate')
    expect(screen.getByText('Breathing Exercise')).toBeInTheDocument()
    expect(screen.getByText('Scripture Soaking')).toBeInTheDocument()
    expect(screen.getByText('Gratitude Reflection')).toBeInTheDocument()
    expect(screen.getByText('ACTS Prayer Walk')).toBeInTheDocument()
    expect(screen.getByText('Psalm Reading')).toBeInTheDocument()
    expect(screen.getByText('Examen')).toBeInTheDocument()
  })

  it('switches tabs on click', async () => {
    const user = userEvent.setup()
    renderPage()
    // Default is Devotional — identified by Pray CTA intro text
    expect(screen.getByText("Ready to pray about today's reading?")).toBeInTheDocument()

    // Click Journal tab
    await user.click(screen.getByRole('tab', { name: /journal/i }))
    expect(
      screen.getByRole('heading', { name: /what's on your mind\?/i }),
    ).toBeInTheDocument()
  })

  it('renders the Spotify embed', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: /today's song pick/i }),
    ).toBeInTheDocument()
  })

  it('does not render quiz teaser or StartingPointQuiz', () => {
    renderPage()
    expect(screen.queryByText(/not sure where to start/i)).not.toBeInTheDocument()
    expect(document.getElementById('quiz')).not.toBeInTheDocument()
  })

  it('does not show checkmarks when logged out', () => {
    renderPage()
    const checkmarks = screen.queryAllByText(/completed today/i)
    expect(checkmarks).toHaveLength(0)
  })

  it('defaults to Devotional for invalid tab param', () => {
    renderPage('/daily?tab=invalid')
    expect(screen.getByText("Ready to pray about today's reading?")).toBeInTheDocument()
  })

  it('supports arrow key navigation between tabs', async () => {
    const user = userEvent.setup()
    renderPage()
    const devTab = screen.getByRole('tab', { name: /devos|devotional/i })
    devTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /pray/i })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /journal/i })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /meditate/i })).toHaveFocus()
    // Wraps around
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /devos|devotional/i })).toHaveFocus()
    // ArrowLeft wraps backward
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: /meditate/i })).toHaveFocus()
  })

  it('preserves textarea text when switching tabs and switching back', async () => {
    const user = userEvent.setup()
    renderPage('/daily?tab=pray')
    const textarea = screen.getByRole('textbox', { name: /prayer request/i })
    await user.type(textarea, 'my prayer text')
    // Switch to Journal
    await user.click(screen.getByRole('tab', { name: /journal/i }))
    // Switch back to Pray
    await user.click(screen.getByRole('tab', { name: /pray/i }))
    expect(screen.getByRole('textbox', { name: /prayer request/i })).toHaveValue('my prayer text')
  })

  it('pre-fills Pray textarea from ?context= URL param', () => {
    renderPage('/daily?tab=pray&context=Praying+for+this+church')
    const textarea = screen.getByRole('textbox', { name: /prayer request/i })
    expect(textarea).toHaveValue('Praying for this church')
  })

  it('sets Journal guided prompt from ?prompt= URL param', () => {
    renderPage('/daily?tab=journal&prompt=Reflect+on+your+visit...')
    // Journal should be in guided mode with the prompt text
    expect(screen.getByText('Reflect on your visit...')).toBeInTheDocument()
  })

  it('existing prayContext still works after URL param support', async () => {
    const user = userEvent.setup()
    renderPage()
    // Ensure basic tab switching still works (no regressions)
    await user.click(screen.getByRole('tab', { name: /journal/i }))
    expect(
      screen.getByRole('heading', { name: /what's on your mind\?/i }),
    ).toBeInTheDocument()
  })

  it('root background uses hero-bg, not dashboard-dark', () => {
    const { container } = renderPage()
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('bg-hero-bg')
    expect(root.className).not.toContain('bg-dashboard-dark')
  })

  it('hero has GlowBackground with glow orb', () => {
    renderPage()
    const glowOrb = document.querySelector('[data-testid="glow-orb"]')
    expect(glowOrb).toBeInTheDocument()
  })

  it('tab bar has pill-shaped container', () => {
    renderPage()
    const tablist = screen.getByRole('tablist')
    expect(tablist.className).toContain('rounded-full')
    expect(tablist.className).toContain('bg-white/[0.06]')
  })

  it('active tab has pill indicator with background', () => {
    renderPage()
    const activeTab = screen.getByRole('tab', { selected: true })
    expect(activeTab.className).toContain('bg-white/[0.12]')
  })

  it('inactive tabs have muted text color', () => {
    renderPage()
    const inactiveTabs = screen.getAllByRole('tab').filter(t => t.getAttribute('aria-selected') === 'false')
    expect(inactiveTabs.length).toBe(3)
    inactiveTabs.forEach(tab => {
      expect(tab.className).toContain('text-white/50')
    })
  })

  it('tab bar outer wrapper has no background color (transparent for glow bleed-through)', () => {
    renderPage()
    const tablist = screen.getByRole('tablist')
    // Outer wrapper is tablist → parent (inner padding div) → parent (sticky div)
    const outerWrapper = tablist.parentElement!.parentElement!
    expect(outerWrapper.className).not.toContain('bg-hero-bg')
    expect(outerWrapper.className).toContain('backdrop-blur-md')
  })

  it('tab bar outer wrapper uses reduced blur (md not lg)', () => {
    renderPage()
    const tablist = screen.getByRole('tablist')
    const outerWrapper = tablist.parentElement!.parentElement!
    expect(outerWrapper.className).toContain('backdrop-blur-md')
    expect(outerWrapper.className).not.toContain('backdrop-blur-lg')
  })

  it('greeting heading uses enlarged text size', () => {
    renderPage()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.className).toContain('text-4xl')
    expect(heading.className).not.toContain('text-3xl')
  })

  it('greeting heading uses leading-[1.15] for descender clearance', () => {
    renderPage()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.className).toContain('leading-[1.15]')
    expect(heading.className).not.toContain('leading-tight')
  })

  it('greeting heading has pb-2 for descender paint room', () => {
    renderPage()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.className).toContain('pb-2')
  })

  it('greeting heading preserves responsive size and weight classes', () => {
    renderPage()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.className).toContain('mb-1')
    expect(heading.className).toContain('text-4xl')
    expect(heading.className).toContain('font-bold')
    expect(heading.className).toContain('sm:text-5xl')
    expect(heading.className).toContain('lg:text-6xl')
  })

  it('tab bar has no animated underline div', () => {
    renderPage()
    const tablist = screen.getByRole('tablist')
    // The old underline was a div with bg-primary inside the tablist
    const underline = tablist.querySelector('div.bg-primary')
    expect(underline).toBeNull()
  })

  it('tab panels do not use animate-tab-fade-in', () => {
    renderPage()
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    panels.forEach(panel => {
      expect(panel.className).not.toContain('animate-tab-fade-in')
    })
  })

  it('tab buttons use hero-bg focus ring offset', () => {
    renderPage()
    const activeTab = screen.getByRole('tab', { selected: true })
    expect(activeTab.className).toContain('ring-offset-hero-bg')
    expect(activeTab.className).not.toContain('ring-offset-dashboard-dark')
  })
})
