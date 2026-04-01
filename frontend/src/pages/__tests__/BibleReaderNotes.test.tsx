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

vi.mock('@/components/daily/CrisisBanner', () => ({
  CrisisBanner: ({ text }: { text: string }) =>
    text.includes('kill myself') ? <div data-testid="crisis-banner">Crisis resources</div> : null,
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

describe('BibleReader — Notes Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = true
  })

  it('clicking Note opens inline editor below verse', async () => {
    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    // Select verse 1 and click Note button
    fireEvent.click(screen.getByLabelText('Verse 1'))
    await waitFor(() => {
      expect(screen.getByLabelText('Add note')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Add note'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a note about this verse...')).toBeInTheDocument()
    })
  })

  it('note editor has character counter', async () => {
    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Verse 1'))
    await waitFor(() => expect(screen.getByLabelText('Add note')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Add note'))

    const textarea = screen.getByPlaceholderText('Add a note about this verse...')
    fireEvent.change(textarea, { target: { value: 'Test note' } })
    expect(screen.getByText('9 / 300')).toBeInTheDocument()
  })

  it('saving a note stores it in localStorage', async () => {
    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Verse 1'))
    await waitFor(() => expect(screen.getByLabelText('Add note')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Add note'))

    const textarea = screen.getByPlaceholderText('Add a note about this verse...')
    fireEvent.change(textarea, { target: { value: 'My first note' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    // Note should be stored in localStorage
    const stored = localStorage.getItem('wr_bible_notes')
    expect(stored).toBeTruthy()
    const notes = JSON.parse(stored!)
    expect(notes).toHaveLength(1)
    expect(notes[0].text).toBe('My first note')
  })

  it('action bar dismisses when note editor opens', async () => {
    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Verse 1'))
    await waitFor(() => expect(screen.getByRole('toolbar')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('Add note'))

    // Action bar should be gone, editor should be present
    await waitFor(() => {
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
      expect(screen.getByPlaceholderText('Add a note about this verse...')).toBeInTheDocument()
    })
  })

  it('cancel closes note editor', async () => {
    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Verse 1'))
    await waitFor(() => expect(screen.getByLabelText('Add note')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Add note'))

    expect(screen.getByPlaceholderText('Add a note about this verse...')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Add a note about this verse...')).not.toBeInTheDocument()
    })
  })

  it('note indicators not visible for logged-out users', async () => {
    mockAuth.isAuthenticated = false
    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(/Note on verse/)).not.toBeInTheDocument()
  })

  it('corrupted localStorage does not crash', async () => {
    localStorage.setItem('wr_bible_notes', 'invalid json!!!')
    localStorage.setItem('wr_bible_highlights', '{not an array}')

    renderReader('/bible/genesis/1')
    await waitFor(() => {
      expect(screen.getByText('In the beginning, God created the heavens and the earth.')).toBeInTheDocument()
    })
    // Should render normally without crashing
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Genesis')
  })
})
