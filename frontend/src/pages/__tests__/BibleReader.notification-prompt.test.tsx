/**
 * BB-52 Step 8: Regression tests for BB-41 notification prompt dismissal persistence.
 *
 * Verifies that once a user dismisses the notification prompt via "Maybe later",
 * it is never shown again on the same or any future BibleReader mount.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BibleReader } from '../BibleReader'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerProvider'
import { AudioProvider } from '@/components/audio/AudioProvider'

// Audio / auth / engine mocks (mirrors BibleReader.test.tsx setup)
vi.mock('@/lib/audio-engine', () => {
  class MockAudioEngineService {
    ensureContext = vi.fn(); addSound = vi.fn().mockResolvedValue(undefined)
    removeSound = vi.fn(); setSoundVolume = vi.fn(); setMasterVolume = vi.fn()
    playForeground = vi.fn(); seekForeground = vi.fn(); setForegroundBalance = vi.fn()
    pauseAll = vi.fn(); resumeAll = vi.fn(); stopAll = vi.fn()
    getSoundCount = vi.fn(() => 0); getForegroundElement = vi.fn(() => null)
  }
  return { AudioEngineService: MockAudioEngineService }
})
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))
vi.mock('@/lib/env', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, isFcbhApiKeyConfigured: () => false }
})
vi.mock('@/lib/audio/engine', () => ({
  createEngineInstance: vi.fn(),
}))
vi.mock('@/lib/audio/media-session', () => ({
  updateMediaSession: vi.fn(),
  clearMediaSession: vi.fn(),
}))
vi.mock('@/data/bible', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/bible')>()
  return {
    ...actual,
    loadChapterWeb: vi.fn(async () => ({
      bookSlug: 'john',
      chapter: 3,
      verses: [{ number: 1, text: 'Verse 1.' }],
      paragraphs: [],
    })),
  }
})
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))
vi.mock('@/lib/bible/crossRefs/loader', () => ({
  loadCrossRefsForBook: vi.fn().mockResolvedValue(new Map()),
}))

// Force same-day delta so the BB-41 condition is met on mount
vi.mock('@/lib/bible/streakStore', () => ({
  recordReadToday: vi.fn().mockReturnValue({
    previousStreak: 1, newStreak: 1,
    delta: 'same-day' as const,
    milestoneReached: null, graceDaysRemaining: 1, isFirstReadEver: false,
  }),
  getStreak: () => ({
    currentStreak: 1, longestStreak: 1, lastReadDate: '', streakStartDate: '',
    graceDaysAvailable: 1, graceDaysUsedThisWeek: 0, lastGraceUsedDate: null,
    weekResetDate: '', milestones: [], totalDaysRead: 1,
  }),
  subscribe: () => () => {},
}))

// Force push support and default permission so prompt can fire
vi.mock('@/lib/notifications/permissions', () => ({
  getPushSupportStatus: () => 'supported',
  getPermissionState: () => 'default',
  requestPermission: vi.fn().mockResolvedValue('default'),
}))
vi.mock('@/lib/notifications/subscription', () => ({
  subscribeToPush: vi.fn(),
}))
vi.mock('@/lib/notifications/preferences', () => ({
  updateNotificationPrefs: vi.fn(),
}))

vi.mock('@/hooks/useReaderAudioAutoStart', () => ({
  useReaderAudioAutoStart: vi.fn(),
}))
vi.mock('@/components/bible/reader/AmbientAudioPicker', () => ({
  AmbientAudioPicker: () => null,
}))

let mockAudioState: {
  drawerOpen: boolean
  activeSounds: unknown[]
  isPlaying: boolean
  pillVisible: boolean
  masterVolume: number
  foregroundContent: unknown
  foregroundBackgroundBalance: number
  sleepTimer: unknown
  activeRoutine: unknown
  currentSceneName: null
  currentSceneId: null
  foregroundEndedCounter: number
  readingContext: null
}
const defaultAudioState = {
  drawerOpen: false,
  activeSounds: [],
  isPlaying: false,
  pillVisible: false,
  masterVolume: 0.8,
  foregroundContent: null,
  foregroundBackgroundBalance: 0.8,
  sleepTimer: null,
  activeRoutine: null,
  currentSceneName: null,
  currentSceneId: null,
  foregroundEndedCounter: 0,
  readingContext: null,
}
vi.mock('@/components/audio/AudioProvider', () => ({
  AudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAudioState: () => mockAudioState,
  useAudioDispatch: () => vi.fn(),
  useAudioEngine: () => null,
  useReadingContext: () => ({ setReadingContext: vi.fn(), clearReadingContext: vi.fn() }),
  useSleepTimerControls: () => ({
    remainingMs: 0, totalDurationMs: 0, isActive: false, isPaused: false,
    start: vi.fn(), pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(),
  }),
}))

function renderReader() {
  return render(
    <MemoryRouter initialEntries={['/bible/john/3']}>
      <AudioProvider>
        <AudioPlayerProvider>
          <Routes>
            <Route path="/bible/:book/:chapter" element={<BibleReader />} />
            <Route path="/bible" element={<div>Bible Browser</div>} />
          </Routes>
        </AudioPlayerProvider>
      </AudioProvider>
    </MemoryRouter>,
  )
}

describe('BibleReader — BB-41 notification prompt dismissal persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAudioState = { ...defaultAudioState }
    vi.clearAllMocks()
  })

  it('prompt appears when dismiss flag is absent and conditions are met', async () => {
    renderReader()
    await waitFor(() => {
      expect(screen.getByText('Never miss your daily verse')).toBeInTheDocument()
    })
  })

  it('prompt is suppressed when dismiss flag is already set', async () => {
    localStorage.setItem('wr_notification_prompt_dismissed', 'true')
    renderReader()
    // Wait for the chapter heading to appear — that means the effect has run
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
    expect(screen.queryByText('Never miss your daily verse')).not.toBeInTheDocument()
  })

  it('clicking "Maybe later" sets dismiss flag AND hides prompt', async () => {
    const user = userEvent.setup()
    renderReader()
    await waitFor(() => {
      expect(screen.getByText('Never miss your daily verse')).toBeInTheDocument()
    })
    const dismissBtn = screen.getByRole('button', { name: 'Maybe later' })
    await user.click(dismissBtn)
    expect(localStorage.getItem('wr_notification_prompt_dismissed')).toBe('true')
    expect(screen.queryByText('Never miss your daily verse')).not.toBeInTheDocument()
  })

  it('dismissal flag persists across component unmount/remount', async () => {
    const user = userEvent.setup()
    const first = renderReader()
    await waitFor(() => {
      expect(screen.getByText('Never miss your daily verse')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Maybe later' }))
    first.unmount()

    // Remount — same localStorage flag persists → prompt should NOT appear
    renderReader()
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
    expect(screen.queryByText('Never miss your daily verse')).not.toBeInTheDocument()
  })
})
