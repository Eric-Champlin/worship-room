import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { MusicPage } from '../MusicPage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isLoggedIn: false })),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: vi.fn(() => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
  })),
}))

vi.mock('@/hooks/useMusicHints', () => ({
  useMusicHints: vi.fn(() => ({
    showSoundGridHint: false,
    showPillHint: false,
    dismissSoundGridHint: vi.fn(),
    dismissPillHint: vi.fn(),
  })),
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

  it('defaults to ambient tab', () => {
    renderPage()
    const ambientTab = screen.getByRole('tab', { name: /ambient/i })
    expect(ambientTab).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to playlists tab on click', async () => {
    const user = userEvent.setup()
    renderPage()
    const playlistsTab = screen.getByRole('tab', { name: /playlists/i })
    await user.click(playlistsTab)
    expect(playlistsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('shows correct content per tab', async () => {
    const user = userEvent.setup()
    renderPage()

    // Default: ambient visible
    expect(screen.getByTestId('ambient-browser')).toBeVisible()

    // Switch to playlists
    await user.click(screen.getByRole('tab', { name: /playlists/i }))
    expect(screen.getByTestId('worship-playlists-tab')).toBeVisible()

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
    // Focus the active tab (ambient, index 1)
    const tabs = screen.getAllByRole('tab')
    tabs[1].focus()
    await user.keyboard('{ArrowRight}')
    // Should move to sleep tab (index 2)
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
  })

  it('initial URL has no tab param (defaults to ambient)', () => {
    renderPage('/music')
    const ambientTab = screen.getByRole('tab', { name: /ambient/i })
    expect(ambientTab).toHaveAttribute('aria-selected', 'true')
  })

  it('URL param selects correct tab', () => {
    renderPage('/music?tab=sleep')
    const sleepTab = screen.getByRole('tab', { name: /sleep/i })
    expect(sleepTab).toHaveAttribute('aria-selected', 'true')
  })

  it('invalid tab param defaults to ambient', () => {
    renderPage('/music?tab=invalid')
    const ambientTab = screen.getByRole('tab', { name: /ambient/i })
    expect(ambientTab).toHaveAttribute('aria-selected', 'true')
  })

  it('has skip-to-content link', () => {
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
})
