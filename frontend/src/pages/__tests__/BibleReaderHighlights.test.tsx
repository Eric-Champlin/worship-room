import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BibleReader } from '../BibleReader'
import type { BibleChapter } from '@/types/bible'

const mockAuth = {
  isAuthenticated: true,
  user: { name: 'Eric' },
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
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

vi.mock('@/hooks/useBibleProgress', () => ({
  useBibleProgress: () => ({
    progress: {},
    markChapterRead: vi.fn(),
    getBookProgress: vi.fn().mockReturnValue([]),
    isChapterRead: vi.fn().mockReturnValue(false),
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
      </Routes>
    </MemoryRouter>,
  )
}

describe('BibleReader — Highlighting Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = true
  })

  it('clicking a verse shows action bar with Highlight button', async () => {
    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    const verse1 = screen.getByLabelText('Verse 1')
    fireEvent.click(verse1)

    await waitFor(() => {
      expect(screen.getByLabelText('Highlight verse')).toBeInTheDocument()
    })
  })

  it('logged-out users see lock message instead of Highlight button', async () => {
    mockAuth.isAuthenticated = false
    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Verse 1'))

    await waitFor(() => {
      expect(screen.getByText('Sign in to highlight and take notes')).toBeInTheDocument()
      expect(screen.queryByLabelText('Highlight verse')).not.toBeInTheDocument()
    })
  })

  it('clicking Highlight reveals color picker circles', async () => {
    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Verse 1'))
    await waitFor(() => {
      expect(screen.getByLabelText('Highlight verse')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Highlight verse'))
    expect(screen.getByLabelText('Highlight yellow')).toBeInTheDocument()
    expect(screen.getByLabelText('Highlight green')).toBeInTheDocument()
    expect(screen.getByLabelText('Highlight blue')).toBeInTheDocument()
    expect(screen.getByLabelText('Highlight pink')).toBeInTheDocument()
  })

  it('selecting a new verse replaces the action bar (only one at a time)', async () => {
    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Verse 1'))
    await waitFor(() => {
      expect(screen.getByRole('toolbar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Verse 2'))
    // Should still only have one toolbar
    const toolbars = screen.getAllByRole('toolbar')
    expect(toolbars).toHaveLength(1)
  })

  it('Escape dismisses action bar', async () => {
    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Verse 1'))
    await waitFor(() => {
      expect(screen.getByRole('toolbar')).toBeInTheDocument()
    })

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
    })
  })

  it('Copy button works for logged-out users', async () => {
    mockAuth.isAuthenticated = false

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })

    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Verse 1'))
    await waitFor(() => {
      expect(screen.getByLabelText('Copy verse')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Copy verse'))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('In the beginning'),
    )
  })
})
