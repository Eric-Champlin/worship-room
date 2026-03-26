import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BibleReader } from '../BibleReader'
import type { BibleChapter } from '@/types/bible'

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

vi.mock('@/hooks/useBibleAudio', () => ({
  useBibleAudio: () => ({
    playbackState: 'idle',
    currentVerseIndex: -1,
    totalVerses: 0,
    speed: 1,
    setSpeed: vi.fn(),
    voiceGender: 'female',
    setVoiceGender: vi.fn(),
    availableVoiceCount: 2,
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    isSupported: true,
  }),
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

const mockMarkChapterRead = vi.fn()
const mockIsChapterRead = vi.fn().mockReturnValue(false)

vi.mock('@/hooks/useBibleProgress', () => ({
  useBibleProgress: () => ({
    progress: {},
    markChapterRead: mockMarkChapterRead,
    getBookProgress: vi.fn().mockReturnValue([]),
    isChapterRead: mockIsChapterRead,
  }),
}))

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
      if (slug === 'genesis') return Promise.resolve({ bookSlug: 'genesis', chapter, verses: [{ number: 1, text: 'Test verse.' }] })
      return Promise.resolve(null)
    }),
  }
})

function renderReader(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/bible/:book/:chapter" element={<BibleReader />} />
        <Route path="/bible" element={<div>Browser Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BibleReader', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
    mockMarkChapterRead.mockClear()
    mockIsChapterRead.mockReturnValue(false)
  })

  describe('Hero section', () => {
    it('renders book name and chapter in heading', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Genesis')
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chapter 1')
      })
    })

    it('book name links back to /bible?book=slug', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 })
        const link = heading.querySelector('a')
        expect(link).toHaveAttribute('href', '/bible?book=genesis')
      })
    })
  })

  describe('Verse display', () => {
    it('renders verses with superscript numbers', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
      })
      // Verify superscript verse numbers
      const sups = document.querySelectorAll('sup')
      expect(sups.length).toBe(3)
      expect(sups[0].textContent).toBe('1')
    })
  })

  describe('Chapter selector', () => {
    it('shows "Chapter X of Y"', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByText('Chapter 1 of 50')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('first chapter hides Previous button', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.queryByText('Previous Chapter')).not.toBeInTheDocument()
      })
      expect(screen.getByText('Next Chapter')).toBeInTheDocument()
    })

    it('last chapter hides Next button', async () => {
      renderReader('/bible/genesis/50')
      await waitFor(() => {
        expect(screen.queryByText('Next Chapter')).not.toBeInTheDocument()
      })
      expect(screen.getByText('Previous Chapter')).toBeInTheDocument()
    })

    it('Previous/Next buttons link to correct chapters', async () => {
      renderReader('/bible/genesis/5')
      await waitFor(() => {
        const prev = screen.getByText('Previous Chapter').closest('a')
        expect(prev).toHaveAttribute('href', '/bible/genesis/4')
        const next = screen.getByText('Next Chapter').closest('a')
        expect(next).toHaveAttribute('href', '/bible/genesis/6')
      })
    })
  })

  describe('Invalid routes', () => {
    it('invalid book slug shows BookNotFound', async () => {
      renderReader('/bible/not-a-book/1')
      await waitFor(() => {
        expect(screen.getByText('Book not found')).toBeInTheDocument()
      })
    })

    it('chapter out of range redirects to chapter 1', async () => {
      renderReader('/bible/genesis/999')
      await waitFor(() => {
        // Should redirect to genesis/1 which means the heading should show chapter 1
        expect(screen.getByText('Chapter 1 of 50')).toBeInTheDocument()
      })
    })
  })

  describe('Cross-feature CTAs', () => {
    it('links to correct Daily Hub tabs', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByText(/Pray about this chapter/)).toBeInTheDocument()
      })
      const prayLink = screen.getByText(/Pray about this chapter/).closest('a')
      expect(prayLink).toHaveAttribute('href', '/daily?tab=pray')
      const journalLink = screen.getByText(/Journal your thoughts/).closest('a')
      expect(journalLink).toHaveAttribute('href', '/daily?tab=journal')
    })
  })

  describe('Auth gating', () => {
    it('IO does not fire for logged-out users (markChapterRead not called)', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
      })
      // markChapterRead should not be called for logged-out users
      expect(mockMarkChapterRead).not.toHaveBeenCalled()
    })
  })

  describe('Breadcrumb', () => {
    it('renders breadcrumb with Bible trail', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
        expect(nav).toBeInTheDocument()
        expect(nav).toHaveTextContent('Bible')
        expect(nav).toHaveTextContent('Genesis')
        expect(nav).toHaveTextContent('Chapter 1')
      })
    })

    it('Bible link points to /bible', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        screen.getByRole('navigation', { name: /breadcrumb/i })
      })
      const bibleLinks = screen.getAllByRole('link', { name: 'Bible' })
      const breadcrumbBibleLink = bibleLinks.find(
        (link) => link.closest('nav[aria-label]') !== null
      )
      expect(breadcrumbBibleLink).toHaveAttribute('href', '/bible')
    })

    it('Book name link points to /bible?book=slug', async () => {
      renderReader('/bible/genesis/1')
      await waitFor(() => {
        screen.getByRole('navigation', { name: /breadcrumb/i })
      })
      // The breadcrumb Genesis link (inside nav) should go to /bible?book=genesis
      const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
      const genesisLink = nav.querySelector('a[href="/bible?book=genesis"]')
      expect(genesisLink).toBeInTheDocument()
      expect(genesisLink).toHaveTextContent('Genesis')
    })

    it('displays full book name', async () => {
      renderReader('/bible/1-corinthians/1')
      await waitFor(() => {
        const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
        expect(nav).toHaveTextContent('1 Corinthians')
      })
    })
  })
})
