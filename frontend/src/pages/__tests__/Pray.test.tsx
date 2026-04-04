import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayTabContent } from '@/components/daily/PrayTabContent'
import { DAILY_COMPLETION_KEY } from '@/constants/daily-experience'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: true })),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

// Mock AudioProvider (needed by AmbientSoundPill embedded in PrayTabContent)
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
  mockUseAuth.mockReturnValue({ user: null, isAuthenticated: true, login: vi.fn(), logout: vi.fn() })
  // Restore matchMedia mock (resetAllMocks clears the setup.ts implementation)
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

function renderComponent(props: {
  onSwitchToJournal?: (topic: string) => void
} = {}) {
  return render(
    <MemoryRouter
      initialEntries={['/daily?tab=pray']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <PrayTabContent {...props} />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('PrayTabContent', () => {
  it('renders textarea with placeholder', () => {
    renderComponent()
    expect(
      screen.getByPlaceholderText(/start typing here/i),
    ).toBeInTheDocument()
  })

  it('renders styled heading', () => {
    renderComponent()
    expect(
      screen.getByRole('heading', { name: /what's on your heart\?/i }),
    ).toBeInTheDocument()
  })

  it('renders 3 default starter chips', () => {
    renderComponent()
    expect(screen.getByText("I'm struggling with...")).toBeInTheDocument()
    expect(screen.getByText('Help me forgive...')).toBeInTheDocument()
    expect(screen.getByText('I feel lost about...')).toBeInTheDocument()
  })

  it('chip fills textarea and hides other chips', async () => {
    const user = userEvent.setup()
    renderComponent()
    await user.click(screen.getByText("I'm struggling with..."))

    const textarea = screen.getByPlaceholderText(
      /start typing here/i,
    ) as HTMLTextAreaElement
    expect(textarea.value).toBe("I'm struggling with...")

    // Other chips should be hidden
    expect(
      screen.queryByText('Help me forgive...'),
    ).not.toBeInTheDocument()
  })

  it('shows nudge when submitting empty', async () => {
    const user = userEvent.setup()
    renderComponent()
    await user.click(screen.getByText('Generate Prayer'))
    expect(
      screen.getByText(/tell god what's on your heart/i),
    ).toBeInTheDocument()
  })

  it('shows loading then prayer after generating', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderComponent()

    const textarea = screen.getByPlaceholderText(
      /start typing here/i,
    )
    await user.type(textarea, "I'm anxious about my job")
    await user.click(screen.getByText('Generate Prayer'))

    // Loading state
    expect(
      screen.getByText(/generating prayer for you/i),
    ).toBeInTheDocument()

    // Advance past loading delay
    vi.advanceTimersByTime(2000)

    await waitFor(() => {
      // KaraokeText splits words into spans, so search for individual word
      expect(screen.getByText('Dear')).toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  it('"Pray about something else" resets the page', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderComponent()

    const textarea = screen.getByPlaceholderText(
      /start typing here/i,
    )
    await user.type(textarea, 'Help me')
    await user.click(screen.getByText('Generate Prayer'))
    vi.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('Dear')).toBeInTheDocument()
    })

    await user.click(screen.getByText(/pray about something else/i))

    expect(
      screen.getByPlaceholderText(/start typing here/i),
    ).toBeInTheDocument()
    expect(screen.getByText("I'm struggling with...")).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('classic prayers section is hidden', () => {
    renderComponent()
    expect(screen.queryByText('Classic Prayers')).not.toBeInTheDocument()
  })

  it('crisis banner shows for "suicide" keyword', async () => {
    const user = userEvent.setup()
    renderComponent()
    const textarea = screen.getByPlaceholderText(
      /start typing here/i,
    )
    await user.type(textarea, 'I am thinking about suicide')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('no crisis banner for normal text', async () => {
    const user = userEvent.setup()
    renderComponent()
    const textarea = screen.getByPlaceholderText(
      /start typing here/i,
    )
    await user.type(textarea, "I'm sad today")
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('writes pray completion to localStorage after generating', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderComponent()

    const textarea = screen.getByPlaceholderText(
      /start typing here/i,
    )
    await user.type(textarea, 'I need help')
    await user.click(screen.getByText('Generate Prayer'))
    vi.advanceTimersByTime(2000)

    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem(DAILY_COMPLETION_KEY) ?? '{}',
      )
      expect(stored.pray).toBe(true)
    })

    vi.useRealTimers()
  })

  it('calls onSwitchToJournal with topic when clicking "Journal about this"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onSwitchToJournal = vi.fn()
    renderComponent({ onSwitchToJournal })

    const textarea = screen.getByPlaceholderText(/start typing here/i)
    await user.type(textarea, 'I have anxiety about work')
    await user.click(screen.getByText('Generate Prayer'))
    vi.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('Dear')).toBeInTheDocument()
    })

    await user.click(screen.getByText(/journal about this/i))
    expect(onSwitchToJournal).toHaveBeenCalledWith('anxiety')

    vi.useRealTimers()
  })

  describe('auth gate', () => {
    it('shows auth modal when logged out and clicking Generate Prayer', async () => {
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(
        /start typing here/i,
      )
      await user.type(textarea, 'I need guidance')
      await user.click(screen.getByText('Generate Prayer'))

      // Auth modal should appear instead of loading
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(
        screen.getByText('Sign in to generate a prayer'),
      ).toBeInTheDocument()

      // Should NOT show loading state
      expect(
        screen.queryByText(/generating prayer for you/i),
      ).not.toBeInTheDocument()
    })

    it('save button works when logged in (no auth modal)', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderComponent()

      const textarea = screen.getByPlaceholderText(
        /start typing here/i,
      )
      await user.type(textarea, 'Help me')
      await user.click(screen.getByText('Generate Prayer'))
      vi.advanceTimersByTime(2000)

      await waitFor(() => {
        expect(screen.getByText('Dear')).toBeInTheDocument()
      })

      // Click Save button — logged in, should NOT show auth modal
      await user.click(screen.getByLabelText('Save prayer'))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      vi.useRealTimers()
    })

    it('classic prayers section is hidden when logged out', () => {
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
      renderComponent()
      expect(screen.queryByText('Classic Prayers')).not.toBeInTheDocument()
    })
  })
})
