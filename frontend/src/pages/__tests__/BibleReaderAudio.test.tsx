import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BibleReader } from '../BibleReader'
import type { BibleChapter } from '@/types/bible'

// --- Auth mock ---
const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
}))

vi.mock('@/hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({
    notifications: [],
    unreadCount: 0,
    markAllAsRead: vi.fn(),
    markAsRead: vi.fn(),
    clearAll: vi.fn(),
  }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/components/ui/WhisperToast', () => ({
  useWhisperToast: () => ({ showWhisperToast: vi.fn() }),
}))

vi.mock('@/hooks/useBibleHighlights', () => ({
  useBibleHighlights: () => ({
    getHighlightsForChapter: vi.fn().mockReturnValue([]),
    getHighlightForVerse: vi.fn().mockReturnValue(undefined),
    setHighlight: vi.fn(),
    removeHighlight: vi.fn(),
    getAllHighlights: vi.fn().mockReturnValue([]),
  }),
}))

vi.mock('@/hooks/useBibleNotes', () => ({
  useBibleNotes: () => ({
    getNotesForChapter: vi.fn().mockReturnValue([]),
    getNoteForVerse: vi.fn().mockReturnValue(undefined),
    saveNote: vi.fn().mockReturnValue(true),
    deleteNote: vi.fn(),
    getAllNotes: vi.fn().mockReturnValue([]),
  }),
}))

vi.mock('@/hooks/useBibleProgress', () => ({
  useBibleProgress: () => ({
    progress: {},
    markChapterRead: vi.fn(),
    getBookProgress: vi.fn().mockReturnValue([]),
    isChapterRead: vi.fn().mockReturnValue(false),
  }),
}))

// --- Bible audio mock ---
const mockBibleAudio = {
  playbackState: 'idle' as 'idle' | 'playing' | 'paused',
  currentVerseIndex: -1,
  totalVerses: 3,
  speed: 1,
  setSpeed: vi.fn(),
  voiceGender: 'female' as const,
  setVoiceGender: vi.fn(),
  availableVoiceCount: 2,
  play: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
  isSupported: true,
}

vi.mock('@/hooks/useBibleAudio', () => ({
  useBibleAudio: () => mockBibleAudio,
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
    currentSceneName: null,
    foregroundContent: null,
    sleepTimer: null,
    activeRoutine: null,
  }),
  useAudioDispatch: () => vi.fn(),
  useAudioEngine: () => null,
  useSleepTimerControls: () => ({
    remainingMs: 0,
    totalDurationMs: 0,
    fadeDurationMs: 0,
    phase: null,
    isActive: false,
    isPaused: false,
    fadeStatus: 'none',
    fadeRemainingMs: 0,
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
  }),
}))

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

// --- Data mock ---
const mockGenesisChapter1: BibleChapter = {
  bookSlug: 'genesis',
  chapter: 1,
  verses: [
    { number: 1, text: 'In the beginning, God created the heavens and the earth.' },
    { number: 2, text: 'The earth was formless and empty.' },
    { number: 3, text: 'God said, "Let there be light," and there was light.' },
  ],
}

vi.mock('@/data/bible', async () => {
  const actual = await vi.importActual('@/data/bible')
  return {
    ...actual,
    loadChapter: vi.fn().mockImplementation((slug: string, chapter: number) => {
      if (slug === 'genesis' && chapter === 1) return Promise.resolve(mockGenesisChapter1)
      if (slug === 'genesis') return Promise.resolve({ bookSlug: 'genesis', chapter, verses: [{ number: 1, text: 'Test.' }] })
      return Promise.resolve(null)
    }),
  }
})

function renderReader(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/bible/:book/:chapter" element={<BibleReader />} />
        <Route path="/bible" element={<div>Browser</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BibleReader — Audio Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
    mockBibleAudio.isSupported = true
    mockBibleAudio.playbackState = 'idle'
    mockBibleAudio.currentVerseIndex = -1
  })

  describe('Audio control bar', () => {
    it('renders on full-text chapters', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByLabelText('Play chapter')).toBeInTheDocument()
      })
    })


    it('hidden when TTS unsupported', async () => {
      mockBibleAudio.isSupported = false
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
      })
      expect(screen.queryByLabelText('Play chapter')).not.toBeInTheDocument()
    })
  })

  describe('Ambient chip', () => {
    it('renders below audio bar', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByLabelText('Add background sounds')).toBeInTheDocument()
      })
    })
  })

  describe('TTS verse highlighting', () => {
    it('applies border-l-2 class on active verse', async () => {
      mockBibleAudio.currentVerseIndex = 1

      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByText('The earth was formless and empty.')).toBeInTheDocument()
      })

      // The 2nd verse's outer div should have TTS highlight classes
      const verseSpan = screen.getByLabelText('Verse 2')
      const outerDiv = verseSpan.parentElement!
      expect(outerDiv.className).toContain('border-l-2')
      expect(outerDiv.className).toContain('border-primary')
      expect(outerDiv.className).toContain('bg-primary/5')
    })

    it('has aria-current="true" on active verse', async () => {
      mockBibleAudio.currentVerseIndex = 0

      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
      })

      const verseSpan = screen.getByLabelText('Verse 1')
      const outerDiv = verseSpan.parentElement!
      expect(outerDiv).toHaveAttribute('aria-current', 'true')
    })

    it('non-active verses do NOT have TTS highlight', async () => {
      mockBibleAudio.currentVerseIndex = 0

      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByText('The earth was formless and empty.')).toBeInTheDocument()
      })

      const verse2Span = screen.getByLabelText('Verse 2')
      const verse2Div = verse2Span.parentElement!
      expect(verse2Div.className).not.toContain('border-l-2')
      expect(verse2Div).not.toHaveAttribute('aria-current')
    })
  })

  describe('Non-regression checks', () => {
    it('IO sentinel still present for scroll completion', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
      })

      const sentinel = document.querySelector('[aria-hidden="true"].h-1')
      expect(sentinel).toBeInTheDocument()
    })

    it('ChapterNav renders', async () => {
      renderReader('/bible/genesis/2')
      await waitFor(() => {
        expect(screen.getByText('Previous Chapter')).toBeInTheDocument()
        expect(screen.getByText('Next Chapter')).toBeInTheDocument()
      })
    })

    it('cross-feature CTAs present', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByText('Continue your time with Genesis 1')).toBeInTheDocument()
      })
      // Engagement bridge section has Pray CTA linking to /daily?tab=pray
      const heading = screen.getByText('Continue your time with Genesis 1')
      const section = heading.closest('section')!
      const prayLink = within(section).getByText('Pray').closest('a')
      expect(prayLink).toHaveAttribute('href', expect.stringContaining('/daily?tab=pray'))
    })

    it('verse click still works (no broken interactions)', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        const verse = screen.getByLabelText('Verse 1')
        expect(verse).toHaveAttribute('role', 'button')
        expect(verse).toHaveAttribute('tabindex', '0')
      })
    })
  })
})
