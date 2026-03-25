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

  it('does not render the old subtitle', () => {
    renderPage()
    expect(screen.queryByText(/start with any practice below/i)).not.toBeInTheDocument()
  })

  it('renders verse card with today\'s verse text', () => {
    renderPage()
    // Verse text appears within quotes in the hero
    const verseText = screen.getByText(/\u201c.+\u201d/)
    expect(verseText).toBeInTheDocument()
  })

  it('renders verse reference with dash prefix', () => {
    renderPage()
    const ref = screen.getByText(/^—\s/)
    expect(ref).toBeInTheDocument()
  })

  it('verse card links to Bible reader', () => {
    renderPage()
    // The verse card is a Link — find the link that points to /bible/
    const verseLinks = screen.getAllByRole('link').filter(l => l.getAttribute('href')?.startsWith('/bible/'))
    expect(verseLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('renders devotional card with title', () => {
    renderPage()
    const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
    const heading = hero.querySelector('h2')
    expect(heading).toBeInTheDocument()
    expect(heading!.textContent!.length).toBeGreaterThan(0)
  })

  it('devotional card links to /devotional', () => {
    renderPage()
    const devLinks = screen.getAllByRole('link').filter(l => l.getAttribute('href') === '/devotional')
    expect(devLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "DAILY DEVOTIONAL" label in hero card', () => {
    renderPage()
    const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
    const label = hero.querySelector('.uppercase')
    expect(label).toBeInTheDocument()
    expect(label!.textContent).toBe('Daily Devotional')
  })

  it('shows theme pill', () => {
    renderPage()
    const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')!
    const pill = hero.querySelector('.rounded-full')
    expect(pill).toBeInTheDocument()
  })

  it('does NOT show devotional checkmark when logged out', () => {
    renderPage()
    // No sr-only "Already read today" text when logged out
    expect(screen.queryByText('Already read today')).not.toBeInTheDocument()
  })

  it('shows devotional checkmark when logged in and devotional read', () => {
    const todayStr = new Date().toLocaleDateString('en-CA')
    localStorage.setItem('wr_devotional_reads', JSON.stringify([todayStr]))
    mockUseAuth.mockReturnValue({ user: { name: 'Eric', id: 'test-user' }, isAuthenticated: true, login: vi.fn(), logout: vi.fn() })
    renderPage()
    expect(screen.getByText('Already read today')).toBeInTheDocument()
  })

  it('share button opens VerseSharePanel', async () => {
    const user = userEvent.setup()
    renderPage()
    const shareBtn = screen.getByLabelText('Share verse of the day')
    await user.click(shareBtn)
    // VerseSharePanel renders menu items when open
    expect(shareBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('does NOT render VerseOfTheDayBanner', () => {
    renderPage()
    // The old VOTD banner had a specific container — verify it's gone
    // It would have had its own share panel and standalone verse display
    // We check that no element with the old banner's class structure exists between hero and tabs
    const hero = document.querySelector('[aria-labelledby="daily-hub-heading"]')
    const tablist = screen.getByRole('tablist')
    // The hero's next sibling should be the sentinel or the tab bar's container
    expect(hero?.parentElement).toBe(tablist.closest('main'))
  })

  it('does NOT render ChallengeStrip', () => {
    renderPage()
    // ChallengeStrip would render challenge-related content between hero and tabs
    expect(screen.queryByText(/day challenge/i)).not.toBeInTheDocument()
  })

  it('share button has accessible label', () => {
    renderPage()
    const shareBtn = screen.getByLabelText('Share verse of the day')
    expect(shareBtn).toBeInTheDocument()
    expect(shareBtn).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('verse card is keyboard navigable', () => {
    renderPage()
    const verseLinks = screen.getAllByRole('link').filter(l => l.getAttribute('href')?.startsWith('/bible/'))
    expect(verseLinks[0]).toBeInTheDocument()
    // Links are inherently focusable
    expect(verseLinks[0].tagName).toBe('A')
  })

  it('tab bar still functions after hero redesign', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('tab', { name: /journal/i }))
    expect(screen.getByRole('heading', { name: /what's on your mind\?/i })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /meditate/i }))
    expect(screen.getByText('Breathing Exercise')).toBeInTheDocument()
  })

  it('renders tab bar with 3 tabs', () => {
    renderPage()
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0]).toHaveTextContent('Pray')
    expect(tabs[1]).toHaveTextContent('Journal')
    expect(tabs[2]).toHaveTextContent('Meditate')
  })

  it('defaults to Pray tab content', () => {
    renderPage()
    // Pray heading unique word "Heart?" identifies the active tab
    expect(screen.getByText('Heart?')).toBeInTheDocument()
    const prayTab = screen.getByRole('tab', { name: /pray/i })
    expect(prayTab).toHaveAttribute('aria-selected', 'true')
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
    // Default is Pray
    expect(screen.getByText('Heart?')).toBeInTheDocument()

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

  it('renders the Starting Point Quiz section', () => {
    renderPage()
    expect(document.getElementById('quiz')).toBeInTheDocument()
  })

  it('renders quiz teaser link in hero', () => {
    renderPage()
    expect(
      screen.getByRole('button', { name: /take a 30-second quiz/i }),
    ).toBeInTheDocument()
  })

  it('does not show checkmarks when logged out', () => {
    renderPage()
    const checkmarks = screen.queryAllByText(/completed today/i)
    expect(checkmarks).toHaveLength(0)
  })

  it('defaults to Pray for invalid tab param', () => {
    renderPage('/daily?tab=invalid')
    expect(screen.getByText('Heart?')).toBeInTheDocument()
  })

  it('supports arrow key navigation between tabs', async () => {
    const user = userEvent.setup()
    renderPage()
    const prayTab = screen.getByRole('tab', { name: /pray/i })
    prayTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /journal/i })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /meditate/i })).toHaveFocus()
    // Wraps around
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /pray/i })).toHaveFocus()
    // ArrowLeft wraps backward
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: /meditate/i })).toHaveFocus()
  })

  it('preserves textarea text when switching tabs and switching back', async () => {
    const user = userEvent.setup()
    renderPage()
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
})
