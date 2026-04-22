import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerProvider'
import { AudioProvider } from '@/components/audio/AudioProvider'

// BB-27: mock audio engine, auth, and toast so AudioProvider/AudioPlayerProvider mount cleanly
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

// BB-26 / Spec 4: mock readiness probe so ReaderChrome's AudioPlayButton renders null
vi.mock('@/services/fcbh-readiness', () => ({
  getFcbhReadiness: () => Promise.resolve(false),
  resetFcbhReadinessCache: () => {},
}))
vi.mock('@/lib/audio/engine', () => ({ createEngineInstance: vi.fn() }))
vi.mock('@/lib/audio/media-session', () => ({
  updateMediaSession: vi.fn(),
  clearMediaSession: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mocks — aligned to the current BibleReader imports (BB-38+ architecture)
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  useToastSafe: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/lib/bible/streakStore', () => ({
  recordReadToday: vi.fn().mockReturnValue({
    previousStreak: 0, newStreak: 1, delta: 'first-read' as const,
    milestoneReached: null, graceDaysRemaining: 1, isFirstReadEver: true,
  }),
  getStreak: () => ({ currentStreak: 0, longestStreak: 0, lastReadDate: '', streakStartDate: '', graceDaysAvailable: 1, graceDaysUsedThisWeek: 0, lastGraceUsedDate: null, weekResetDate: '', milestones: [], totalDaysRead: 0 }),
  subscribe: () => () => {},
}))

vi.mock('@/lib/bible/crossRefs/loader', () => ({
  loadCrossRefsForBook: vi.fn().mockResolvedValue(new Map()),
  collectCrossRefsForRange: vi.fn().mockReturnValue([]),
  getCachedBook: vi.fn().mockReturnValue(null),
  getDeduplicatedCrossRefCount: vi.fn().mockReturnValue(0),
}))

vi.mock('@/hooks/useReaderAudioAutoStart', () => ({
  useReaderAudioAutoStart: vi.fn(),
}))

vi.mock('@/components/bible/reader/AmbientAudioPicker', () => ({
  AmbientAudioPicker: () => null,
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  AudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAudioState: () => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
    currentSceneName: null,
    currentSceneId: null,
    foregroundContent: null,
    foregroundBackgroundBalance: 0.8,
    foregroundEndedCounter: 0,
    sleepTimer: null,
    activeRoutine: null,
    readingContext: null,
  }),
  useAudioDispatch: () => vi.fn(),
  useAudioEngine: () => null,
  useReadingContext: () => ({
    setReadingContext: vi.fn(),
    clearReadingContext: vi.fn(),
  }),
  useSleepTimerControls: () => ({
    remainingMs: 0,
    totalDurationMs: 0,
    isActive: false,
    isPaused: false,
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
  }),
}))

// Mock loadChapterWeb (the BibleReader uses loadChapterWeb, not loadChapter)
vi.mock('@/data/bible', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/bible')>()
  return {
    ...actual,
    loadChapterWeb: vi.fn().mockImplementation((slug: string, chapter: number) => {
      if (slug === 'genesis' && chapter === 1) {
        return Promise.resolve({
          bookSlug: 'genesis',
          chapter: 1,
          verses: [
            { number: 1, text: 'In the beginning, God created the heavens and the earth.' },
            { number: 2, text: 'The earth was formless and empty.' },
            { number: 3, text: 'God said, "Let there be light," and there was light.' },
          ],
          paragraphs: [],
        })
      }
      if (slug === 'genesis') {
        return Promise.resolve({
          bookSlug: 'genesis',
          chapter,
          verses: [{ number: 1, text: 'Test verse.' }],
          paragraphs: [],
        })
      }
      return Promise.resolve(null)
    }),
  }
})

import { BibleReader } from '../BibleReader'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders BibleReader at the given route. The route can include query params
 * like ?verse=1 to pre-select a verse (BB-38 URL-driven selection).
 */
function renderReader(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AudioProvider>
        <AudioPlayerProvider>
          <Routes>
            <Route path="/bible/:book/:chapter" element={<BibleReader />} />
          </Routes>
        </AudioPlayerProvider>
      </AudioProvider>
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BibleReader — Highlighting Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    // jsdom doesn't implement scrollIntoView
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = vi.fn()
    }
  })

  it('deep-linked action sheet shows action buttons (Highlight, Copy)', async () => {
    // BB-38: verse + action in URL opens the sheet with a sub-view.
    // Navigate "Back" from the sub-view to reveal the root view with all actions.
    renderReader('/bible/genesis/1?verse=1&action=highlight')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Click "Back" to navigate from highlight sub-view to the root action view
    fireEvent.click(screen.getByLabelText('Back'))

    await waitFor(() => {
      // Root view shows primary actions including Highlight
      expect(screen.getByLabelText('Highlight')).toBeInTheDocument()
      // Secondary actions include Copy
      expect(screen.getByLabelText('Copy')).toBeInTheDocument()
    })
  })

  it('action sheet has no auth gating (works for all users)', async () => {
    // The redesigned VerseActionSheet has no auth gating — all actions are
    // available regardless of login state (auth gating deferred to Phase 3).
    // No useAuth mock is provided — BibleReader itself does not import useAuth.
    renderReader('/bible/genesis/1?verse=1&action=highlight')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Back to root view
    fireEvent.click(screen.getByLabelText('Back'))

    await waitFor(() => {
      // Highlight and Copy are available for everyone
      expect(screen.getByLabelText('Highlight')).toBeInTheDocument()
      expect(screen.getByLabelText('Copy')).toBeInTheDocument()
    })
  })

  it('deep-linking action=highlight opens the color picker sub-view', async () => {
    // Pre-select verse 1 and open the Highlight sub-view via URL
    renderReader('/bible/genesis/1?verse=1&action=highlight')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    await waitFor(() => {
      // The color picker uses emotion-based labels (Peace, Joy, etc.)
      // Each button has aria-label like "Peace highlight", "Joy highlight"
      expect(screen.getByLabelText('Peace highlight')).toBeInTheDocument()
      expect(screen.getByLabelText('Conviction highlight')).toBeInTheDocument()
      expect(screen.getByLabelText('Joy highlight')).toBeInTheDocument()
      expect(screen.getByLabelText('Struggle highlight')).toBeInTheDocument()
      expect(screen.getByLabelText('Promise highlight')).toBeInTheDocument()
    })
  })

  it('only one dialog renders at a time when verse changes', async () => {
    const { rerender } = renderReader('/bible/genesis/1?verse=1&action=highlight')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Re-render with a different verse (simulates URL-driven verse change)
    rerender(
      <MemoryRouter initialEntries={['/bible/genesis/1?verse=2&action=highlight']}>
        <AudioProvider>
          <AudioPlayerProvider>
            <Routes>
              <Route path="/bible/:book/:chapter" element={<BibleReader />} />
            </Routes>
          </AudioPlayerProvider>
        </AudioProvider>
      </MemoryRouter>,
    )

    // Should still only have one dialog
    await waitFor(() => {
      const dialogs = screen.getAllByRole('dialog')
      expect(dialogs).toHaveLength(1)
    })
  })

  it('removing the verse param dismisses the action sheet', async () => {
    renderReader('/bible/genesis/1?verse=1&action=highlight')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Unmount the old tree and render fresh without verse param
    cleanup()
    renderReader('/bible/genesis/1')

    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    // No dialog should be present without a verse + action in the URL
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Copy action copies verse text to clipboard', async () => {
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })

    // Open sheet via deep link, then navigate to root view where Copy is accessible
    renderReader('/bible/genesis/1?verse=1&action=highlight')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Back to root view
    fireEvent.click(screen.getByLabelText('Back'))

    await waitFor(() => {
      // "Copy" is a secondary action in the action sheet
      expect(screen.getByLabelText('Copy')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Copy'))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('In the beginning'),
    )
  })
})
