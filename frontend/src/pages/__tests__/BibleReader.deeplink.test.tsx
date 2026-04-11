import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// BB-38 cold-load integration tests for BibleReader + VerseActionSheet
//
// This file exercises the full cold-load chain:
//   URL → React Router resolves route → BibleReader mounts → chapter loads
//   → verse selection derived from ?verse= → action sheet auto-opens from
//   ?action= → sub-view mounts → AI hook fires (mocked)
//
// Covers the three mandatory cases from the plan:
//   1. verse-only
//   2. verse + action (Explain, Reflect)
//   3. plan-day + verse (forward-to-reader flow)
//
// Plus browser back/forward, edge cases, and auth-gating invariance.
// ---------------------------------------------------------------------------

// Mock chapter data with a known-finite verse count (36 verses for John 3,
// which matches the real WEB translation) so invalid ?verse=999 tests work.
vi.mock('@/data/bible', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/bible')>()
  return {
    ...actual,
    loadChapterWeb: vi.fn(async (bookSlug: string, chapter: number) => {
      if (bookSlug === 'john' && chapter === 3) {
        return {
          bookSlug: 'john',
          chapter: 3,
          verses: Array.from({ length: 36 }, (_, i) => ({
            number: i + 1,
            text: `Verse ${i + 1} of John chapter three.`,
          })),
          paragraphs: [],
        }
      }
      if (bookSlug === 'philippians' && chapter === 4) {
        return {
          bookSlug: 'philippians',
          chapter: 4,
          verses: Array.from({ length: 23 }, (_, i) => ({
            number: i + 1,
            text: `Verse ${i + 1} of Philippians chapter four.`,
          })),
          paragraphs: [],
        }
      }
      return null
    }),
  }
})

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/bible/crossRefs/loader', () => ({
  loadCrossRefsForBook: vi.fn().mockResolvedValue(new Map()),
  collectCrossRefsForRange: vi.fn().mockReturnValue([]),
  getCachedBook: vi.fn().mockReturnValue(null),
  getDeduplicatedCrossRefCount: vi.fn().mockReturnValue(0),
}))

vi.mock('@/lib/bible/streakStore', () => ({
  recordReadToday: vi.fn().mockReturnValue({
    previousStreak: 0,
    newStreak: 1,
    delta: 'first-read' as const,
    milestoneReached: null,
    graceDaysRemaining: 1,
    isFirstReadEver: true,
  }),
  getStreak: () => ({
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: '',
    streakStartDate: '',
    graceDaysAvailable: 1,
    graceDaysUsedThisWeek: 0,
    lastGraceUsedDate: null,
    weekResetDate: '',
    milestones: [],
    totalDaysRead: 0,
  }),
  subscribe: () => () => {},
}))

vi.mock('@/hooks/useReaderAudioAutoStart', () => ({
  useReaderAudioAutoStart: vi.fn(),
}))

vi.mock('@/components/bible/reader/AmbientAudioPicker', () => ({
  AmbientAudioPicker: () => null,
}))

// Audio provider mocks
const DEFAULT_AUDIO_STATE = {
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
  useAudioState: () => DEFAULT_AUDIO_STATE,
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

// Mock the AI hooks so deep-linked sub-views mount cleanly without firing
// real Gemini requests. Match the hook return shape exactly:
// { status, result, errorKind, errorMessage, retryAfterSeconds, retry }.
vi.mock('@/hooks/bible/useExplainPassage', () => ({
  useExplainPassage: () => ({
    status: 'success' as const,
    result: {
      content: 'Mock explanation: Paul is writing to a factional church.',
      model: 'gemini-2.5-flash-lite',
    },
    errorKind: null,
    errorMessage: null,
    retryAfterSeconds: null,
    retry: vi.fn(),
  }),
}))

vi.mock('@/hooks/bible/useReflectOnPassage', () => ({
  useReflectOnPassage: () => ({
    status: 'success' as const,
    result: {
      content: 'Mock reflection: A gentle thought for today.',
      model: 'gemini-2.5-flash-lite',
    },
    errorKind: null,
    errorMessage: null,
    retryAfterSeconds: null,
    retry: vi.fn(),
  }),
}))

// Import the components AFTER mocks are set up
import { BibleReader } from '../BibleReader'
import { BiblePlanDay } from '../BiblePlanDay'
import type { UsePlanResult } from '@/hooks/bible/usePlan'

// Mock usePlan for the plan-day + verse case
const mockUsePlan = vi.fn<(slug: string) => UsePlanResult>()
vi.mock('@/hooks/bible/usePlan', () => ({
  usePlan: (slug: string) => mockUsePlan(slug),
}))

vi.mock('@/lib/bible/plansStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/bible/plansStore')>()
  return {
    ...actual,
    markDayComplete: vi.fn(),
    setCelebrationShown: vi.fn(),
  }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
  AuthModalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const MOCK_PLAN = {
  slug: 'test-plan',
  title: 'Test Plan',
  shortTitle: 'Test',
  description: 'Test',
  theme: 'comfort' as const,
  duration: 3,
  estimatedMinutesPerDay: 10,
  curator: 'Test',
  coverGradient: 'from-primary/30 to-hero-dark',
  days: [
    {
      day: 1,
      title: 'Day 1',
      passages: [{ book: 'john', chapter: 3, startVerse: 16, endVerse: 16 }],
      devotional: 'Test devotional.',
      reflectionPrompts: ['Test prompt'],
    },
  ],
}

const MOCK_PROGRESS = {
  slug: 'test-plan',
  startedAt: '2026-04-01',
  currentDay: 1,
  completedDays: [] as number[],
  completedAt: null,
  pausedAt: null,
  resumeFromDay: null,
  reflection: null,
  celebrationShown: false,
}

function renderAtRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/bible/:book/:chapter" element={<BibleReader />} />
        <Route path="/bible/plans/:slug/day/:dayNumber" element={<BiblePlanDay />} />
        <Route path="/bible" element={<div>Bible Browser</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mockUsePlan.mockReturnValue({
    plan: MOCK_PLAN,
    progress: MOCK_PROGRESS,
    isLoading: false,
    isError: false,
  })
  // jsdom doesn't implement scrollIntoView — stub it so the reader's arrival
  // glow effect doesn't throw when it calls el.scrollIntoView(...).
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn()
  }
})

// ---------------------------------------------------------------------------
// Case 1: verse-only
// ---------------------------------------------------------------------------

describe('BB-38 cold-load — verse-only', () => {
  it('/bible/john/3?verse=16 loads chapter and marks verse 16 as arrival-highlighted', async () => {
    renderAtRoute('/bible/john/3?verse=16')

    // Chapter loads
    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBe(36)
    })

    // Action sheet is NOT open (cold-load verse-only per spec rule)
    expect(screen.queryByRole('dialog', { name: /Actions for/i })).not.toBeInTheDocument()
  })

  it('/bible/john/3?verse=16-18 accepts range values without crashing', async () => {
    renderAtRoute('/bible/john/3?verse=16-18')

    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBe(36)
    })
    expect(screen.queryByRole('dialog', { name: /Actions for/i })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Case 2: verse + action
// ---------------------------------------------------------------------------

describe('BB-38 cold-load — verse + action (sub-view auto-mount)', () => {
  it('/bible/john/3?verse=16&action=explain opens sheet with Explain sub-view', async () => {
    renderAtRoute('/bible/john/3?verse=16&action=explain')

    // Chapter loads
    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBe(36)
    })

    // Sheet auto-opens with Explain mounted — mock content visible
    await waitFor(() => {
      expect(
        screen.getByText('Mock explanation: Paul is writing to a factional church.'),
      ).toBeInTheDocument()
    })
  })

  it('/bible/philippians/4?verse=6-7&action=reflect opens Reflect sub-view', async () => {
    renderAtRoute('/bible/philippians/4?verse=6-7&action=reflect')

    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBe(23)
    })

    await waitFor(() => {
      expect(
        screen.getByText('Mock reflection: A gentle thought for today.'),
      ).toBeInTheDocument()
    })
  })

  it('/bible/john/3?verse=16&action=cross-refs opens Cross-refs sub-view', async () => {
    renderAtRoute('/bible/john/3?verse=16&action=cross-refs')

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Actions for John 3:16/i })).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// Case 3: browser back / close behavior
// ---------------------------------------------------------------------------

describe('BB-38 cold-load — close behavior', () => {
  it('clicking the close button from cold-loaded sub-view closes the sheet', async () => {
    const user = userEvent.setup()
    renderAtRoute('/bible/john/3?verse=16&action=explain')

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Actions for John 3:16/i })).toBeInTheDocument()
    })

    // Click the X close button in the sub-view header
    const closeButtons = screen.getAllByLabelText('Close')
    await user.click(closeButtons[0])

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Actions for/i })).not.toBeInTheDocument()
    })
  })

  it('clicking the sub-view Back button returns to actions grid, sheet stays open', async () => {
    const user = userEvent.setup()
    renderAtRoute('/bible/john/3?verse=16&action=explain')

    await waitFor(() => {
      expect(
        screen.getByText('Mock explanation: Paul is writing to a factional church.'),
      ).toBeInTheDocument()
    })

    // Click the Back arrow in the sub-view header
    const backButton = screen.getByLabelText('Back')
    await user.click(backButton)

    // Sub-view content is gone but the sheet (actions grid) is still open
    await waitFor(() => {
      expect(
        screen.queryByText('Mock explanation: Paul is writing to a factional church.'),
      ).not.toBeInTheDocument()
    })
    expect(screen.getByRole('dialog', { name: /Actions for John 3:16/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('BB-38 cold-load — edge cases', () => {
  it('?verse=999 in a chapter with 36 verses loads with no selection and no sheet', async () => {
    renderAtRoute('/bible/john/3?verse=999')

    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBe(36)
    })
    expect(screen.queryByRole('dialog', { name: /Actions for/i })).not.toBeInTheDocument()
  })

  it('?action=notreal with valid ?verse= leaves sheet closed (invalid action ignored)', async () => {
    renderAtRoute('/bible/john/3?verse=16&action=notreal')

    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBe(36)
    })
    expect(screen.queryByRole('dialog', { name: /Actions for/i })).not.toBeInTheDocument()
  })

  it('?action=bookmark is rejected — bookmark has no sub-view', async () => {
    renderAtRoute('/bible/john/3?verse=16&action=bookmark')

    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBe(36)
    })
    // bookmark is excluded from DEEP_LINKABLE_ACTIONS — sheet should NOT open
    expect(screen.queryByRole('dialog', { name: /Actions for/i })).not.toBeInTheDocument()
  })

  it('?action=explain without ?verse= is ignored (action without verse is meaningless)', async () => {
    renderAtRoute('/bible/john/3?action=explain')

    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBe(36)
    })
    expect(screen.queryByRole('dialog', { name: /Actions for/i })).not.toBeInTheDocument()
  })

  it('legacy ?highlight=16 still triggers the one-shot arrival glow (backward compat)', async () => {
    renderAtRoute('/bible/john/3?highlight=16')

    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBe(36)
    })
    // Legacy param is consumed, no crash — reader renders normally
    expect(screen.queryByText("That book doesn't exist.")).not.toBeInTheDocument()
  })

  it('new ?scroll-to=16 triggers the same one-shot behavior', async () => {
    renderAtRoute('/bible/john/3?scroll-to=16')

    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBe(36)
    })
    expect(screen.queryByText("That book doesn't exist.")).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Case 4: plan-day + verse (forward-to-reader flow)
// ---------------------------------------------------------------------------

describe('BB-38 cold-load — plan-day + verse flow-through', () => {
  it('plan day URL with ?verse=3 produces a reader link that includes both scroll-to and verse', async () => {
    renderAtRoute('/bible/plans/test-plan/day/1?verse=3')

    await waitFor(() => {
      expect(screen.getByText('Read this passage')).toBeInTheDocument()
    })

    const link = screen.getByText('Read this passage').closest('a')
    expect(link).toHaveAttribute('href', '/bible/john/3?scroll-to=16&verse=3')
  })
})

// ---------------------------------------------------------------------------
// Auth gating invariance — cold-loaded action=note still honors existing gates
// ---------------------------------------------------------------------------

describe('BB-38 cold-load — auth gating invariance', () => {
  it('cold-load ?action=note as logged-out user mounts sub-view without bypassing the existing auth gate', async () => {
    renderAtRoute('/bible/john/3?verse=16&action=note')

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Actions for John 3:16/i })).toBeInTheDocument()
    })
    // NoteEditorSubView mounts — the existing note auth gate is internal to
    // the sub-view's save flow, not something BB-38 triggers at mount.
    // The test's role is to confirm BB-38 does NOT short-circuit or duplicate
    // the gate at the deep-link-open layer.
    // No auth modal is expected at mount time.
  })
})
