import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { MusicPage } from '../MusicPage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false })),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: vi.fn(() => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
  })),
  useAudioDispatch: vi.fn(() => vi.fn()),
  useAudioEngine: vi.fn(() => ({
    addSound: vi.fn().mockResolvedValue(undefined),
    removeSound: vi.fn(),
  })),
}))

vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: vi.fn(() => ({
    activeSceneId: null,
    loadScene: vi.fn(),
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
  })),
}))

vi.mock('@/services/storage-service', () => ({
  storageService: {
    setAuthState: vi.fn(),
    decodeSharedMix: vi.fn(() => null),
    getFavorites: vi.fn(() => []),
    getSavedMixes: vi.fn(() => []),
    getRecentSessions: vi.fn(() => []),
    getListeningHistory: vi.fn(() => []),
    getSessionState: vi.fn(() => null),
    clearSessionState: vi.fn(),
  },
  StorageQuotaError: class StorageQuotaError extends Error {},
}))

vi.mock('@/data/sound-catalog', () => ({
  SOUND_BY_ID: new Map(),
}))

vi.mock('@/components/audio/AmbientBrowser', () => ({
  AmbientBrowser: () => <div data-testid="ambient-browser">AmbientBrowser</div>,
}))

vi.mock('@/components/audio/SleepBrowse', () => ({
  SleepBrowse: () => <div data-testid="sleep-browse">SleepBrowse</div>,
}))

vi.mock('@/components/music/WorshipPlaylistsTab', () => ({
  WorshipPlaylistsTab: () => (
    <div data-testid="worship-playlists-tab">WorshipPlaylistsTab</div>
  ),
}))

beforeEach(() => {
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

function renderPage(initialEntry = '/music') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <MusicPage />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('MusicPage', () => {
  it('renders hero with "Music" title', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Music' }),
    ).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    renderPage()
    expect(
      screen.getByText(/Worship, rest, and find peace/),
    ).toBeInTheDocument()
  })

  it('renders 3 tabs', () => {
    renderPage()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
  })

  it('defaults to playlists tab', () => {
    renderPage()
    const playlistsTab = screen.getByRole('tab', { name: /playlists/i })
    expect(playlistsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to ambient tab on click', async () => {
    const user = userEvent.setup()
    renderPage()
    const ambientTab = screen.getByRole('tab', { name: /ambient/i })
    await user.click(ambientTab)
    expect(ambientTab).toHaveAttribute('aria-selected', 'true')
  })

  it('shows correct content per tab', async () => {
    const user = userEvent.setup()
    renderPage()

    // Default: playlists visible
    expect(screen.getByTestId('worship-playlists-tab')).toBeVisible()

    // Switch to ambient
    await user.click(screen.getByRole('tab', { name: /ambient/i }))
    expect(screen.getByTestId('ambient-browser')).toBeVisible()

    // Switch to sleep
    await user.click(screen.getByRole('tab', { name: /sleep/i }))
    expect(screen.getByTestId('sleep-browse')).toBeVisible()
  })

  it('tab bar has tablist role', () => {
    renderPage()
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('tabs have proper ARIA', () => {
    renderPage()
    const tabs = screen.getAllByRole('tab')
    for (const tab of tabs) {
      expect(tab).toHaveAttribute('aria-selected')
      expect(tab).toHaveAttribute('aria-controls')
    }
  })

  it('keyboard navigation (ArrowRight)', async () => {
    const user = userEvent.setup()
    renderPage()
    // Focus the active tab (playlists, index 0)
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()
    await user.keyboard('{ArrowRight}')
    // Should move to ambient tab (index 1)
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowRight wraps from last tab to first', async () => {
    const user = userEvent.setup()
    renderPage('/music?tab=sleep')
    const tabs = screen.getAllByRole('tab')
    tabs[2].focus()
    await user.keyboard('{ArrowRight}')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('Home/End keys preserved', async () => {
    const user = userEvent.setup()
    renderPage('/music?tab=ambient')
    const tabs = screen.getAllByRole('tab')
    tabs[1].focus()
    await user.keyboard('{End}')
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    tabs[2].focus()
    await user.keyboard('{Home}')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('initial URL has no tab param (defaults to playlists)', () => {
    renderPage('/music')
    const playlistsTab = screen.getByRole('tab', { name: /playlists/i })
    expect(playlistsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('URL param selects correct tab', () => {
    renderPage('/music?tab=sleep')
    const sleepTab = screen.getByRole('tab', { name: /sleep/i })
    expect(sleepTab).toHaveAttribute('aria-selected', 'true')
  })

  it('invalid tab param defaults to playlists', () => {
    renderPage('/music?tab=invalid')
    const playlistsTab = screen.getByRole('tab', { name: /playlists/i })
    expect(playlistsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('has skip-to-content link (via Navbar)', () => {
    renderPage()
    expect(screen.getByText('Skip to content')).toBeInTheDocument()
  })

  it('tab panels have correct role and aria-labelledby', () => {
    renderPage()
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    expect(panels).toHaveLength(3)
    expect(panels[0]).toHaveAttribute('aria-labelledby', 'tab-playlists')
    expect(panels[1]).toHaveAttribute('aria-labelledby', 'tab-ambient')
    expect(panels[2]).toHaveAttribute('aria-labelledby', 'tab-sleep')
  })

  it('URL param ?tab=playlists selects playlists tab', () => {
    renderPage('/music?tab=playlists')
    const playlistsTab = screen.getByRole('tab', { name: /playlists/i })
    expect(playlistsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('personalization section not rendered when logged out', () => {
    renderPage()
    expect(
      screen.queryByLabelText('Personalized recommendations'),
    ).not.toBeInTheDocument()
  })

  it('default tab is always playlists regardless of time', () => {
    renderPage('/music')
    const playlistsTab = screen.getByRole('tab', { name: /playlists/i })
    expect(playlistsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('h1 renders "Music" without Caveat accent', () => {
    renderPage()
    const heading = screen.getByRole('heading', { level: 1, name: 'Music' })
    expect(heading.querySelector('.font-script')).toBeNull()
  })

  it('tab bar uses pill+halo structure', () => {
    renderPage()
    const tablist = screen.getByRole('tablist')
    expect(tablist.className).toContain('rounded-full')
    expect(tablist.className).toContain('bg-white/[0.06]')
  })

  it('active tab has halo glow and pill background', () => {
    renderPage()
    const playlistsTab = screen.getByRole('tab', { name: /playlists/i })
    expect(playlistsTab.className).toContain('bg-white/[0.12]')
    expect(playlistsTab.className).toContain('shadow-[0_0_12px_rgba(139,92,246,0.15)]')
  })

  it('each tab contains an icon SVG', () => {
    renderPage()
    const tabs = screen.getAllByRole('tab')
    for (const tab of tabs) {
      expect(tab.querySelector('svg')).toBeInTheDocument()
    }
  })

  it('no animated underline element', () => {
    renderPage()
    const tablist = screen.getByRole('tablist')
    const underline = tablist.querySelector(
      '[class*="bg-primary"][class*="transition-transform"]',
    )
    expect(underline).toBeNull()
  })

  it('does not render time-of-day section', () => {
    renderPage()
    expect(screen.queryByText(/Suggested for You/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Great for Focus/i)).not.toBeInTheDocument()
  })

  it('does not render lofi references', () => {
    renderPage()
    expect(screen.queryByText(/lofi/i)).not.toBeInTheDocument()
  })
})
