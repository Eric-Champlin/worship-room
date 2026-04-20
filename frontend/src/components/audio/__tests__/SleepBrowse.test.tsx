import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SleepBrowse } from '../SleepBrowse'
import type { AudioState } from '@/types/audio'

// ── Mocks ────────────────────────────────────────────────────────────

const mockOpenAuthModal = vi.fn()
const mockDispatch = vi.fn()

const mockAudioElement = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  pause: vi.fn(),
  play: vi.fn().mockResolvedValue(undefined),
  src: '',
}

const mockEngine = {
  playForeground: vi.fn().mockReturnValue(mockAudioElement),
  seekForeground: vi.fn(),
  getForegroundElement: vi.fn().mockReturnValue(mockAudioElement),
  audioContext: null,
  foregroundGainNode: null,
}

let mockIsAuthenticated = false
let mockForegroundContent: AudioState['foregroundContent'] = null

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: mockIsAuthenticated }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: mockForegroundContent,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: null,
    currentSceneName: null,
    currentSceneId: null,
  }),
  useAudioDispatch: () => mockDispatch,
  useAudioEngine: () => mockEngine,
}))

// ── Tests ────────────────────────────────────────────────────────────

function renderSleepBrowse() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SleepBrowse />
    </MemoryRouter>,
  )
}

describe('SleepBrowse Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthenticated = false
    mockForegroundContent = null
  })

  it('renders Tonight\'s Scripture section', () => {
    renderSleepBrowse()

    expect(screen.getByText("Tonight's Scripture")).toBeInTheDocument()
  })

  it('renders all 4 scripture collection headings', () => {
    renderSleepBrowse()

    expect(screen.getByRole('heading', { name: 'Psalms of Peace' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Comfort & Rest' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trust in God' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: "God's Promises" })).toBeInTheDocument()
  })

  it('renders Bedtime Stories section with 12 cards', () => {
    renderSleepBrowse()

    expect(
      screen.getByRole('heading', { name: 'Bedtime Stories' }),
    ).toBeInTheDocument()
    const storyBadges = screen.getAllByText('Story')
    expect(storyBadges).toHaveLength(12)
  })

  it('clicking a scripture play button when logged out triggers auth modal', async () => {
    mockIsAuthenticated = false
    renderSleepBrowse()

    // Click the first scripture card play button
    const playButtons = screen.getAllByLabelText(/^Play .+/)
    await userEvent.click(playButtons[0])

    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to listen to sleep content',
    )
  })

  it('clicking a bedtime story play button when logged out triggers auth modal', async () => {
    mockIsAuthenticated = false
    renderSleepBrowse()

    // Find a story card button (full aria-label includes metadata)
    const storyPlayButton = screen.getByLabelText(/^Play Noah and the Great Flood/)
    await userEvent.click(storyPlayButton)

    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to listen to sleep content',
    )
  })

  it('renders "Build a Bedtime Routine" CTA', () => {
    renderSleepBrowse()

    expect(screen.getByText('Build a Bedtime Routine')).toBeInTheDocument()
    expect(
      screen.getByText('Chain scenes, scripture, and stories into one seamless sleep experience'),
    ).toBeInTheDocument()
  })

  it('routine CTA links to /music/routines', () => {
    renderSleepBrowse()

    const link = screen.getByRole('link', { name: 'Create a Routine' })
    expect(link).toHaveAttribute('href', '/music/routines')
  })

  it('routine CTA is a white pill with purple text', () => {
    renderSleepBrowse()
    const link = screen.getByRole('link', { name: 'Create a Routine' })
    expect(link.className).toContain('bg-white')
    expect(link.className).toContain('text-primary')
  })

  it('routine CTA has a 44px minimum touch target', () => {
    renderSleepBrowse()
    const link = screen.getByRole('link', { name: 'Create a Routine' })
    expect(link.className).toContain('min-h-[44px]')
  })
})
