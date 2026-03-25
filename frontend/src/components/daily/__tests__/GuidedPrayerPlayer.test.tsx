import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { GuidedPrayerPlayer } from '../GuidedPrayerPlayer'
import type { GuidedPrayerSession } from '@/types/guided-prayer'

// --- Mock the player hook ---
const mockPlay = vi.fn()
const mockPause = vi.fn()
const mockStop = vi.fn()

let mockPlayerState = {
  isPlaying: true,
  isPaused: false,
  isComplete: false,
  currentSegmentIndex: 0,
  currentSegment: { type: 'narration' as 'narration' | 'silence', text: 'Test narration text here.', durationSeconds: 10 },
  currentWordIndex: 0,
  ttsAvailable: true,
  elapsedSeconds: 30,
  totalDurationSeconds: 300,
  progressPercent: 10,
  play: mockPlay,
  pause: mockPause,
  stop: mockStop,
  autoStartedAmbient: false,
  ambientSceneName: null as string | null,
}

vi.mock('@/hooks/useGuidedPrayerPlayer', () => ({
  useGuidedPrayerPlayer: () => mockPlayerState,
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}))

const mockAudioDispatch = vi.fn()
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [{ id: 'test' }],
    isPlaying: true,
    currentSceneName: 'Still Waters',
    currentSceneId: 'still-waters',
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: null,
    sleepTimer: null,
    activeRoutine: null,
    masterVolume: 0.8,
    foregroundBackgroundBalance: 0.5,
    foregroundEndedCounter: 0,
  }),
  useAudioDispatch: () => mockAudioDispatch,
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

// --- Test data ---
const TEST_SESSION: GuidedPrayerSession = {
  id: 'test-session',
  title: 'Finding Peace',
  description: 'Let go of anxiety.',
  theme: 'peace',
  durationMinutes: 10,
  icon: 'Leaf',
  completionVerse: {
    reference: 'Isaiah 26:3',
    text: 'You will keep whoever\'s mind is steadfast in perfect peace.',
  },
  script: [
    { type: 'narration', text: 'Test narration text here.', durationSeconds: 10 },
    { type: 'silence', text: '', durationSeconds: 5 },
  ],
}

// --- Helpers ---
function renderPlayer(overrides: Partial<typeof mockPlayerState> = {}) {
  Object.assign(mockPlayerState, overrides)

  const onClose = vi.fn()
  const onComplete = vi.fn()
  const onJournalAboutThis = vi.fn()
  const onTryAnother = vi.fn()

  const result = render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <GuidedPrayerPlayer
              session={TEST_SESSION}
              onClose={onClose}
              onComplete={onComplete}
              onJournalAboutThis={onJournalAboutThis}
              onTryAnother={onTryAnother}
            />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  return { ...result, onClose, onComplete, onJournalAboutThis, onTryAnother }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPlayerState = {
    isPlaying: true,
    isPaused: false,
    isComplete: false,
    currentSegmentIndex: 0,
    currentSegment: { type: 'narration', text: 'Test narration text here.', durationSeconds: 10 },
    currentWordIndex: 0,
    ttsAvailable: true,
    elapsedSeconds: 30,
    totalDurationSeconds: 300,
    progressPercent: 10,
    play: mockPlay,
    pause: mockPause,
    stop: mockStop,
    autoStartedAmbient: false,
    ambientSceneName: null,
  }
})

describe('GuidedPrayerPlayer — playback view', () => {
  it('renders full-screen overlay with dark background', () => {
    renderPlayer()
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain('bg-hero-dark')
    expect(dialog.className).toContain('fixed')
    expect(dialog.className).toContain('inset-0')
    expect(dialog.className).toContain('z-50')
  })

  it('shows session title', () => {
    renderPlayer()
    expect(screen.getByText('Finding Peace')).toBeInTheDocument()
  })

  it('shows narration text during narration segment', () => {
    renderPlayer()
    expect(screen.getByText(/Test narration text here/)).toBeInTheDocument()
  })

  it('shows "Be still..." during silence segment', () => {
    renderPlayer({
      currentSegment: { type: 'silence' as const, text: '', durationSeconds: 5 },
    })
    expect(screen.getByText('Be still...')).toBeInTheDocument()
  })

  it('Pause button visible when playing', () => {
    renderPlayer({ isPlaying: true })
    expect(screen.getByLabelText('Pause')).toBeInTheDocument()
  })

  it('Play button visible when paused', () => {
    renderPlayer({ isPlaying: false, isPaused: true })
    expect(screen.getByLabelText('Play')).toBeInTheDocument()
  })

  it('Play/Pause button calls correct handler', async () => {
    const user = userEvent.setup()
    renderPlayer({ isPlaying: true })
    await user.click(screen.getByLabelText('Pause'))
    expect(mockPause).toHaveBeenCalled()
  })

  it('Stop button calls stop()', async () => {
    const user = userEvent.setup()
    renderPlayer()
    await user.click(screen.getByLabelText('Stop and close'))
    expect(mockStop).toHaveBeenCalled()
  })

  it('progress bar has correct ARIA attributes', () => {
    renderPlayer({ elapsedSeconds: 30, totalDurationSeconds: 300 })
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '30')
    expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    expect(progressBar).toHaveAttribute('aria-valuemax', '300')
  })

  it('displays time correctly', () => {
    renderPlayer({ elapsedSeconds: 30, totalDurationSeconds: 300 })
    expect(screen.getByText('0:30 / 5:00')).toBeInTheDocument()
  })

  it('sound indicator hidden when no ambient auto-started', () => {
    renderPlayer({ autoStartedAmbient: false })
    expect(screen.queryByText(/Sound:/)).not.toBeInTheDocument()
  })

  it('sound indicator shown when ambient auto-started', () => {
    renderPlayer({ autoStartedAmbient: true, ambientSceneName: 'Still Waters' })
    expect(screen.getByText(/Sound:/)).toBeInTheDocument()
    expect(screen.getByText(/Still Waters/)).toBeInTheDocument()
  })

  it('locks body scroll on mount', () => {
    renderPlayer()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body scroll on unmount', () => {
    const { unmount } = renderPlayer()
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})

describe('GuidedPrayerPlayer — completion view', () => {
  it('shows "Amen" on completion', () => {
    renderPlayer({ isComplete: true })
    expect(screen.getByText('Amen')).toBeInTheDocument()
  })

  it('shows session title on completion', () => {
    renderPlayer({ isComplete: true })
    expect(screen.getByText('Finding Peace')).toBeInTheDocument()
  })

  it('shows duration text on completion', () => {
    renderPlayer({ isComplete: true })
    expect(screen.getByText('10 minutes of guided prayer')).toBeInTheDocument()
  })

  it('shows completion verse', () => {
    renderPlayer({ isComplete: true })
    expect(
      screen.getByText(/You will keep whoever.*perfect peace/)
    ).toBeInTheDocument()
    expect(screen.getByText(/Isaiah 26:3/)).toBeInTheDocument()
  })

  it('"Journal about this" CTA calls handler', async () => {
    const user = userEvent.setup()
    const { onJournalAboutThis } = renderPlayer({ isComplete: true })
    await user.click(screen.getByText('Journal about this'))
    expect(onJournalAboutThis).toHaveBeenCalled()
  })

  it('"Try another session" CTA calls handler', async () => {
    const user = userEvent.setup()
    const { onTryAnother } = renderPlayer({ isComplete: true })
    await user.click(screen.getByText('Try another session'))
    expect(onTryAnother).toHaveBeenCalled()
  })

  it('"Return to Prayer" CTA calls onClose', async () => {
    const user = userEvent.setup()
    const { onClose } = renderPlayer({ isComplete: true })
    await user.click(screen.getByText('Return to Prayer'))
    expect(onClose).toHaveBeenCalled()
  })

  it('"Amen" uses script font', () => {
    renderPlayer({ isComplete: true })
    const amen = screen.getByText('Amen')
    expect(amen.className).toContain('font-script')
  })
})
