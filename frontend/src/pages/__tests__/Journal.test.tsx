import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { JournalTabContent } from '@/components/daily/JournalTabContent'
import {
  JOURNAL_DRAFT_KEY,
  JOURNAL_MODE_KEY,
  DAILY_COMPLETION_KEY,
} from '@/constants/daily-experience'
import { _resetCacheForTesting as resetJournalCache } from '@/lib/bible/journalStore'
import type { PrayContext } from '@/types/daily-experience'

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

// Mock AudioProvider (needed by AmbientSoundPill embedded in JournalTabContent)
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

// C9: direct import after vi.mock (hoisted) — no top-level await needed
import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  localStorage.clear()
  resetJournalCache()
  vi.resetAllMocks()
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

function renderComponent(props: {
  prayContext?: PrayContext | null
  onSwitchTab?: (tab: string) => void
} = {}) {
  return render(
    <MemoryRouter
      initialEntries={['/daily?tab=journal']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <JournalTabContent {...props} />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('JournalTabContent', () => {
  it('defaults to Guided mode', () => {
    renderComponent()
    const guidedBtn = screen.getByText('Guided')
    expect(guidedBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('remembers mode preference from localStorage', () => {
    localStorage.setItem(JOURNAL_MODE_KEY, 'free')
    renderComponent()
    const freeBtn = screen.getByText('Free Write')
    expect(freeBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('guided mode shows prompt card with refresh button', () => {
    renderComponent()
    expect(screen.getByLabelText('New prompt')).toBeInTheDocument()
  })

  it('free write mode hides prompt card', async () => {
    const user = userEvent.setup()
    renderComponent()
    await user.click(screen.getByText('Free Write'))
    expect(screen.queryByLabelText('New prompt')).not.toBeInTheDocument()
  })

  it('preserves text when toggling modes', async () => {
    const user = userEvent.setup()
    renderComponent()
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'Hello world')
    await user.click(screen.getByText('Free Write'))
    expect(textarea).toHaveValue('Hello world')
    await user.click(screen.getByText('Guided'))
    expect(textarea).toHaveValue('Hello world')
  })

  it('pray context banner only shows in free-write mode', async () => {
    const user = userEvent.setup()
    renderComponent({ prayContext: { from: 'pray', topic: 'anxiety' } })
    // In guided mode (default), the context banner is not shown
    expect(
      screen.queryByText(/continuing from your prayer about/i),
    ).not.toBeInTheDocument()
    // Switch to free write mode to see the banner
    await user.click(screen.getByText('Free Write'))
    expect(
      screen.getByText(/continuing from your prayer about.*anxiety/i),
    ).toBeInTheDocument()
  })

  it('save entry button is disabled when textarea is empty', () => {
    renderComponent()
    const saveBtn = screen.getByText('Save Entry')
    expect(saveBtn).toBeDisabled()
  })

  it('saves entry and shows "Write another" and "Done journaling"', async () => {
    const user = userEvent.setup()
    renderComponent()
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'Today I am grateful')
    await user.click(screen.getByText('Save Entry'))

    expect(screen.getByText('Write another')).toBeInTheDocument()
    expect(screen.getByText('Done journaling')).toBeInTheDocument()
    expect(screen.getByText('Today I am grateful')).toBeInTheDocument()
  })

  it('"Reflect on my entry" shows a reflection', async () => {
    const user = userEvent.setup()
    renderComponent()
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'I feel grateful')
    await user.click(screen.getByText('Save Entry'))
    await user.click(screen.getByText('Reflect on my entry'))

    expect(screen.getByText('Reflection')).toBeInTheDocument()
  })

  it('"Done journaling" shows handoff CTAs', async () => {
    const user = userEvent.setup()
    renderComponent()
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'My entry')
    await user.click(screen.getByText('Save Entry'))
    await user.click(screen.getByText('Done journaling'))

    expect(screen.getByText(/continue to meditate/i)).toBeInTheDocument()
    expect(screen.getByText('Visit the Prayer Wall')).toBeInTheDocument()
  })

  it('"Done journaling" calls onSwitchTab when clicking Continue to Meditate', async () => {
    const user = userEvent.setup()
    const onSwitchTab = vi.fn()
    renderComponent({ onSwitchTab })
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'My entry')
    await user.click(screen.getByText('Save Entry'))
    await user.click(screen.getByText('Done journaling'))

    await user.click(screen.getByText(/continue to meditate/i))
    expect(onSwitchTab).toHaveBeenCalledWith('meditate')
  })

  it('saves draft to localStorage', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderComponent()
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'draft text')

    // Advance past debounce
    vi.advanceTimersByTime(1500)

    await waitFor(() => {
      expect(localStorage.getItem(JOURNAL_DRAFT_KEY)).toBe('draft text')
    })

    vi.useRealTimers()
  })

  it('writes journal completion to localStorage after saving', async () => {
    const user = userEvent.setup()
    renderComponent()
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'Something meaningful')
    await user.click(screen.getByText('Save Entry'))

    const stored = JSON.parse(
      localStorage.getItem(DAILY_COMPLETION_KEY) ?? '{}',
    )
    expect(stored.journal).toBe(true)
  })

  it('crisis banner shows for "suicide" keyword', async () => {
    const user = userEvent.setup()
    renderComponent()
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'I am thinking about suicide')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  // Heading was removed in favor of compact layout
  it('does not render "What\'s On Your Mind?" heading', () => {
    renderComponent()
    expect(
      screen.queryByRole('heading', { name: /what's on your mind\?/i }),
    ).not.toBeInTheDocument()
  })

  // A4: saved entries use semantic section
  it('saved entries render inside a section with heading', async () => {
    const user = userEvent.setup()
    renderComponent()
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'My entry')
    await user.click(screen.getByText('Save Entry'))

    const section = screen.getByRole('region', { name: /saved entries/i })
    expect(section).toBeInTheDocument()
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  describe('auth gate', () => {
    it('shows auth modal when logged out and clicking Save Entry', async () => {
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByLabelText('Journal entry')
      await user.type(textarea, 'Today I am grateful')
      await user.click(screen.getByText('Save Entry'))

      // Auth modal should appear with contextual subtitle
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(
        screen.getByText('Sign in to save your journal entries. Your draft is safe — we\u2019ll bring it back after.'),
      ).toBeInTheDocument()

      // Entry should NOT be saved
      expect(screen.queryByText('Write another')).not.toBeInTheDocument()
    })

    it('shows auth modal when logged out and clicking Reflect on my entry', async () => {
      // First save an entry while logged in
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByLabelText('Journal entry')
      await user.type(textarea, 'I feel grateful')
      await user.click(screen.getByText('Save Entry'))

      // Switch to logged out and trigger re-render via mode toggle
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
      await user.click(screen.getByRole('button', { name: 'Free Write' }))
      await user.click(screen.getByRole('button', { name: 'Guided' }))

      await user.click(screen.getByText('Reflect on my entry'))

      // Auth modal should appear
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(
        screen.getByText('Sign in to reflect on your entry'),
      ).toBeInTheDocument()

      // Reflection should NOT appear
      expect(screen.queryByText('Reflection')).not.toBeInTheDocument()
    })

    it('auth modal can be dismissed', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderComponent()

      const textarea = screen.getByLabelText('Journal entry')
      await user.type(textarea, 'Test entry')
      await user.click(screen.getByText('Save Entry'))

      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await user.click(screen.getByLabelText('Close'))

      // Wait for 150ms close animation
      act(() => { vi.advanceTimersByTime(200) })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      vi.useRealTimers()
    })

    it('does not gate draft auto-save', async () => {
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderComponent()

      const textarea = screen.getByLabelText('Journal entry')
      await user.type(textarea, 'draft text')

      vi.advanceTimersByTime(1500)

      await waitFor(() => {
        expect(localStorage.getItem(JOURNAL_DRAFT_KEY)).toBe('draft text')
      })

      // No auth modal should appear
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      vi.useRealTimers()
    })
  })
})
