import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

let mockIsLoggedIn = false
let mockForegroundContent: AudioState['foregroundContent'] = null

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: mockIsLoggedIn }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
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
  }),
  useAudioDispatch: () => mockDispatch,
  useAudioEngine: () => mockEngine,
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('SleepBrowse Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoggedIn = false
    mockForegroundContent = null
  })

  it('renders Tonight\'s Scripture section', () => {
    render(<SleepBrowse />)

    expect(screen.getByText("Tonight's Scripture")).toBeInTheDocument()
  })

  it('renders all 4 scripture collection headings', () => {
    render(<SleepBrowse />)

    expect(screen.getByRole('heading', { name: 'Psalms of Peace' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Comfort & Rest' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trust in God' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: "God's Promises" })).toBeInTheDocument()
  })

  it('renders Bedtime Stories section with 12 cards', () => {
    render(<SleepBrowse />)

    expect(
      screen.getByRole('heading', { name: 'Bedtime Stories' }),
    ).toBeInTheDocument()
    const storyBadges = screen.getAllByText('Story')
    expect(storyBadges).toHaveLength(12)
  })

  it('clicking a scripture play button when logged out triggers auth modal', async () => {
    mockIsLoggedIn = false
    render(<SleepBrowse />)

    // Click the first scripture card play button
    const playButtons = screen.getAllByLabelText(/^Play .+/)
    await userEvent.click(playButtons[0])

    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to listen to sleep content',
    )
  })

  it('clicking a bedtime story play button when logged out triggers auth modal', async () => {
    mockIsLoggedIn = false
    render(<SleepBrowse />)

    // Find a story card button (full aria-label includes metadata)
    const storyPlayButton = screen.getByLabelText(/^Play Noah and the Great Flood/)
    await userEvent.click(storyPlayButton)

    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to listen to sleep content',
    )
  })
})
