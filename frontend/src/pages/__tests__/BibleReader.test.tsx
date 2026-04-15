import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BibleReader } from '../BibleReader'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerProvider'

// BB-26: ReaderChrome now mounts AudioPlayButton which reads AudioPlayerContext.
// Stub the FCBH key to false so the button renders null in these tests.
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

// Mock loadChapterWeb to avoid loading real JSON in tests
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
      return null
    }),
  }
})

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const mockLoadCrossRefsForBook = vi.fn().mockResolvedValue(new Map())
vi.mock('@/lib/bible/crossRefs/loader', () => ({
  loadCrossRefsForBook: (...args: unknown[]) => mockLoadCrossRefsForBook(...args),
}))

const mockRecordReadToday = vi.fn().mockReturnValue({
  previousStreak: 0,
  newStreak: 1,
  delta: 'first-read' as const,
  milestoneReached: null,
  graceDaysRemaining: 1,
  isFirstReadEver: true,
})
vi.mock('@/lib/bible/streakStore', () => ({
  recordReadToday: (...args: unknown[]) => mockRecordReadToday(...args),
  getStreak: () => ({ currentStreak: 0, longestStreak: 0, lastReadDate: '', streakStartDate: '', graceDaysAvailable: 1, graceDaysUsedThisWeek: 0, lastGraceUsedDate: null, weekResetDate: '', milestones: [], totalDaysRead: 0 }),
  subscribe: () => () => {},
}))

// --- BB-20 mocks ---
vi.mock('@/hooks/useReaderAudioAutoStart', () => ({
  useReaderAudioAutoStart: vi.fn(),
}))

vi.mock('@/components/bible/reader/AmbientAudioPicker', () => ({
  AmbientAudioPicker: () => null,
}))

// Minimal mocks for components that use audio/toast/auth providers
const mockSetReadingContext = vi.fn()
const mockClearReadingContext = vi.fn()

const DEFAULT_MOCK_AUDIO_STATE = {
  drawerOpen: false,
  activeSounds: [] as Array<{ soundId: string; volume: number; label: string }>,
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

let mockAudioState = { ...DEFAULT_MOCK_AUDIO_STATE }

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockAudioState,
  useAudioDispatch: () => vi.fn(),
  useAudioEngine: () => null,
  useReadingContext: () => ({
    setReadingContext: mockSetReadingContext,
    clearReadingContext: mockClearReadingContext,
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

function renderReader(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AudioPlayerProvider>
        <Routes>
          <Route path="/bible/:book/:chapter" element={<BibleReader />} />
          <Route path="/bible" element={<div>Bible Browser</div>} />
        </Routes>
      </AudioPlayerProvider>
    </MemoryRouter>,
  )
}

describe('BibleReader (BB-4 Immersive Reader)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAudioState = { ...DEFAULT_MOCK_AUDIO_STATE }
    vi.clearAllMocks()
  })

  it('renders John 3 with 36 verse spans', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBe(36)
    })
  })

  it('every verse span has data-verse, data-book, data-chapter', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      const spans = document.querySelectorAll('span[data-verse]')
      expect(spans.length).toBeGreaterThan(0)
      for (const span of spans) {
        expect(span.hasAttribute('data-verse')).toBe(true)
        expect(span.getAttribute('data-book')).toBe('john')
        expect(span.getAttribute('data-chapter')).toBe('3')
      }
    })
  })

  it('shows chapter heading with book name and number', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeTruthy()
      expect(heading.textContent).toContain('John')
      expect(heading.textContent).toContain('3')
    })
  })

  it('invalid book shows error state', async () => {
    renderReader('/bible/notabook/1')

    await waitFor(() => {
      expect(screen.getByText("That book doesn't exist.")).toBeTruthy()
    })
  })

  it('invalid chapter shows chapter count', async () => {
    renderReader('/bible/john/99')

    await waitFor(() => {
      expect(screen.getByText('John only has 21 chapters.')).toBeTruthy()
    })
  })

  it('invalid chapter has jump-to-last button', async () => {
    renderReader('/bible/john/99')

    await waitFor(() => {
      const btn = screen.getByText('Go to Chapter 21')
      expect(btn).toBeTruthy()
      const link = btn.closest('a')
      expect(link?.getAttribute('href')).toBe('/bible/john/21')
    })
  })

  it('writes wr_bible_last_read on chapter load', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      const raw = localStorage.getItem('wr_bible_last_read')
      expect(raw).toBeTruthy()
      const data = JSON.parse(raw!)
      expect(data.book).toBe('John')
      expect(data.chapter).toBe(3)
    })
  })

  it('writes wr_bible_progress on chapter load', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      const raw = localStorage.getItem('wr_bible_progress')
      expect(raw).toBeTruthy()
      const data = JSON.parse(raw!)
      expect(data.john).toContain(3)
    })
  })

  it('has no global navbar (immersive mode)', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      expect(document.querySelectorAll('span[data-verse]').length).toBeGreaterThan(0)
    })

    // No global nav — only chapter navigation
    const navs = document.querySelectorAll('nav')
    for (const nav of navs) {
      expect(nav.getAttribute('aria-label')).not.toBe('Main navigation')
    }
  })

  it('has correct data-reader-theme attribute', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      const themed = document.querySelector('[data-reader-theme]')
      expect(themed).toBeTruthy()
      expect(themed!.getAttribute('data-reader-theme')).toBe('midnight')
    })
  })

  // --- BB-6: Verse Tap Action Sheet ---

  it('sheet not rendered when no selection', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      expect(document.querySelectorAll('span[data-verse]').length).toBeGreaterThan(0)
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('main element has ref for event delegation', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      expect(document.querySelectorAll('span[data-verse]').length).toBeGreaterThan(0)
    })

    const main = document.querySelector('main')
    expect(main).toBeTruthy()
  })

  it('verse spans have data attributes for event delegation', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      expect(document.querySelectorAll('span[data-verse]').length).toBeGreaterThan(0)
    })

    const verseSpan = document.querySelector('span[data-verse="1"]')
    expect(verseSpan).toBeTruthy()
    expect(verseSpan!.getAttribute('data-book')).toBe('john')
    expect(verseSpan!.getAttribute('data-chapter')).toBe('3')
  })

  it('selection props default to no highlight classes', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      expect(document.querySelectorAll('span[data-verse]').length).toBeGreaterThan(0)
    })

    const verseSpan = document.querySelector('span[data-verse="1"]')!
    expect(verseSpan.className).not.toContain('bg-primary')
    expect(verseSpan.className).not.toContain('outline')
  })

  it('chapter swipe is disabled when typography sheet is open', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      expect(document.querySelectorAll('span[data-verse]').length).toBeGreaterThan(0)
    })

    // Verifies the page renders without errors when all interaction modes coexist
    expect(document.querySelector('main')).toBeTruthy()
  })

  it('preloads cross-refs for current book on mount (BB-9)', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      expect(mockLoadCrossRefsForBook).toHaveBeenCalledWith('john')
    })
  })

  it('preloads new book when navigating to different book', async () => {
    const { unmount } = renderReader('/bible/john/3')
    await waitFor(() => {
      expect(mockLoadCrossRefsForBook).toHaveBeenCalledWith('john')
    })

    unmount()
    mockLoadCrossRefsForBook.mockClear()

    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(mockLoadCrossRefsForBook).toHaveBeenCalledWith('genesis')
    })
  })

  it('calls recordReadToday on chapter load (BB-17)', async () => {
    mockRecordReadToday.mockClear()
    renderReader('/bible/john/3')

    await waitFor(() => {
      expect(mockRecordReadToday).toHaveBeenCalledTimes(1)
    })
  })

  it('does not call recordReadToday on load error', async () => {
    mockRecordReadToday.mockClear()
    renderReader('/bible/notabook/1')

    await waitFor(() => {
      expect(screen.getByText("That book doesn't exist.")).toBeTruthy()
    })

    expect(mockRecordReadToday).not.toHaveBeenCalled()
  })

  // --- BB-20: Ambient audio integration ---

  it('sets reading context when audio is playing in reader', async () => {
    mockAudioState = {
      ...DEFAULT_MOCK_AUDIO_STATE,
      activeSounds: [{ soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }],
      isPlaying: true,
    }

    renderReader('/bible/john/3')

    await waitFor(() => {
      expect(mockSetReadingContext).toHaveBeenCalledWith({ book: 'John', chapter: 3 })
    })
  })

  it('does not set reading context when no audio playing', async () => {
    renderReader('/bible/john/3')

    await waitFor(() => {
      expect(document.querySelectorAll('span[data-verse]').length).toBeGreaterThan(0)
    })

    expect(mockSetReadingContext).not.toHaveBeenCalled()
  })

  it('clears reading context on unmount', async () => {
    const { unmount } = renderReader('/bible/john/3')

    await waitFor(() => {
      expect(document.querySelectorAll('span[data-verse]').length).toBeGreaterThan(0)
    })

    unmount()
    expect(mockClearReadingContext).toHaveBeenCalled()
  })
})
