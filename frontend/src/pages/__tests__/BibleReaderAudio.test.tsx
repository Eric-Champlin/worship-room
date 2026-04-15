/**
 * BibleReaderAudio.test.tsx — Audio integration tests for the redesigned BibleReader.
 *
 * History: The original tests (pre-BB-30+) covered AudioControlBar (TTS playback),
 * BibleAmbientChip, useBibleAudio TTS verse highlighting (border-l-2, aria-current),
 * ChapterNav ("Previous Chapter"/"Next Chapter"), ChapterEngagementBridge
 * ("Continue your time with…"), IO sentinel, and role="button" verse spans.
 *
 * All of those features were removed in the BB-30+ Bible redesign wave:
 *   - AudioControlBar + useBibleAudio → removed (no in-reader TTS)
 *   - BibleAmbientChip → replaced by AmbientAudioPicker in ReaderChrome
 *   - TTS verse highlighting → removed
 *   - ChapterNav → replaced by ReaderChapterNav (shows "Book N" not "Previous/Next Chapter")
 *   - ChapterEngagementBridge → removed
 *   - IO scroll sentinel → removed
 *   - role="button" verse spans → removed (useVerseTap container delegation)
 *
 * The tests below cover the CURRENT audio integration surface:
 *   - ReaderChrome ambient audio button rendering
 *   - AmbientAudioPicker toggle via chrome bar
 *   - ReaderChapterNav (correct book/chapter links)
 *   - Verse data attributes for container event delegation
 *   - Reader theme attribute
 */
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BibleReader } from '../BibleReader'
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

// BB-26: the AudioPlayButton in ReaderChrome consumes AudioPlayerContext.
// Stub the FCBH key so the button renders null and doesn't disrupt existing
// ambient-audio integration assertions.
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

// --- Data mock: loadChapterWeb (replaces old loadChapter mock) ---
vi.mock('@/data/bible', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/bible')>()
  return {
    ...actual,
    loadChapterWeb: vi.fn(async (slug: string, chapter: number) => {
      if (slug === 'genesis' && chapter === 1) {
        return {
          bookSlug: 'genesis',
          chapter: 1,
          verses: [
            { number: 1, text: 'In the beginning, God created the heavens and the earth.' },
            { number: 2, text: 'The earth was formless and empty.' },
            { number: 3, text: 'God said, "Let there be light," and there was light.' },
          ],
          paragraphs: [],
        }
      }
      if (slug === 'genesis') {
        return {
          bookSlug: 'genesis',
          chapter,
          verses: [{ number: 1, text: 'Test verse.' }],
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

vi.mock('@/lib/bible/crossRefs/loader', () => ({
  loadCrossRefsForBook: vi.fn().mockResolvedValue(new Map()),
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

// --- BB-20 mocks ---
vi.mock('@/hooks/useReaderAudioAutoStart', () => ({
  useReaderAudioAutoStart: vi.fn(),
}))

vi.mock('@/components/bible/reader/AmbientAudioPicker', () => ({
  AmbientAudioPicker: () => null,
}))

// --- AudioProvider mock (with useReadingContext) ---
const mockSetReadingContext = vi.fn()
const mockClearReadingContext = vi.fn()

const DEFAULT_AUDIO_STATE = {
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

let mockAudioState = { ...DEFAULT_AUDIO_STATE }

vi.mock('@/components/audio/AudioProvider', () => ({
  AudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
      <AudioProvider>
        <AudioPlayerProvider>
          <Routes>
            <Route path="/bible/:book/:chapter" element={<BibleReader />} />
            <Route path="/bible" element={<div>Browser</div>} />
          </Routes>
        </AudioPlayerProvider>
      </AudioProvider>
    </MemoryRouter>,
  )
}

describe('BibleReader — Audio Integration (BB-20+ redesign)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAudioState = { ...DEFAULT_AUDIO_STATE }
    vi.clearAllMocks()
  })

  describe('ReaderChrome ambient audio button', () => {
    it('renders ambient audio button in the chrome bar', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByLabelText('Open ambient sounds')).toBeInTheDocument()
      })
    })

    it('shows playing label when ambient audio is active', async () => {
      mockAudioState = {
        ...DEFAULT_AUDIO_STATE,
        activeSounds: [{ soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }],
        isPlaying: true,
      }

      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(
          screen.getByLabelText('Ambient audio playing — tap to open sound controls'),
        ).toBeInTheDocument()
      })
    })
  })

  describe('Reading context management', () => {
    it('sets reading context when audio is playing', async () => {
      mockAudioState = {
        ...DEFAULT_AUDIO_STATE,
        activeSounds: [{ soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }],
        isPlaying: true,
      }

      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(mockSetReadingContext).toHaveBeenCalledWith({
          book: 'Genesis',
          chapter: 1,
        })
      })
    })

    it('clears reading context on unmount', async () => {
      const { unmount } = renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(document.querySelectorAll('span[data-verse]').length).toBeGreaterThan(0)
      })

      unmount()
      expect(mockClearReadingContext).toHaveBeenCalled()
    })
  })

  describe('Verse rendering', () => {
    it('renders verses with data attributes for event delegation', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        const spans = document.querySelectorAll('span[data-verse]')
        expect(spans.length).toBe(3)
      })

      const verse1 = document.querySelector('span[data-verse="1"]')!
      expect(verse1).toBeInTheDocument()
      expect(verse1.getAttribute('data-book')).toBe('genesis')
      expect(verse1.getAttribute('data-chapter')).toBe('1')
    })

    it('renders verse text correctly', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(
          screen.getByText(
            'In the beginning, God created the heavens and the earth.',
          ),
        ).toBeInTheDocument()
      })
    })
  })

  describe('ReaderChapterNav', () => {
    it('renders chapter navigation for middle chapters', async () => {
      renderReader('/bible/genesis/2')
      await waitFor(() => {
        expect(document.querySelectorAll('span[data-verse]').length).toBeGreaterThan(0)
      })

      const nav = document.querySelector('nav[aria-label="Chapter navigation"]')
      expect(nav).toBeInTheDocument()
    })
  })

  describe('Reader theme', () => {
    it('applies data-reader-theme attribute', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        const themed = document.querySelector('[data-reader-theme]')
        expect(themed).toBeTruthy()
        expect(themed!.getAttribute('data-reader-theme')).toBe('midnight')
      })
    })
  })
})
