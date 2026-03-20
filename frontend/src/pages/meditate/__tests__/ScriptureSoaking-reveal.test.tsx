import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ScriptureSoaking } from '../ScriptureSoaking'
import { useReducedMotion } from '@/hooks/useReducedMotion'

vi.mock('@/hooks/useReducedMotion')

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { name: 'Eric' }, isAuthenticated: true })),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    isPlaying: false,
    currentSceneName: null,
    currentSceneId: null,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: null,
    sleepTimer: null,
    activeRoutine: null,
    masterVolume: 0.8,
    foregroundBackgroundBalance: 0.5,
    foregroundEndedCounter: 0,
  }),
  useAudioDispatch: () => vi.fn(),
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

function renderSoaking() {
  return render(
    <MemoryRouter initialEntries={['/meditate/soaking']}>
      <ScriptureSoaking />
    </MemoryRouter>,
  )
}

async function startExercise(user: ReturnType<typeof userEvent.setup>) {
  // Select 5 min duration
  await user.click(screen.getByRole('button', { name: /5 min/i }))
  // Click Begin
  await user.click(screen.getByRole('button', { name: /begin/i }))
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.mocked(useReducedMotion).mockReturnValue(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ScriptureSoaking — KaraokeTextReveal Integration', () => {
  it('verse renders via KaraokeTextReveal when exercise starts', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSoaking()

    await startExercise(user)

    // Verse words should be in the DOM (split into individual spans)
    const blockquote = screen.getByRole('blockquote') ?? document.querySelector('blockquote')
    expect(blockquote).toBeTruthy()
  })

  it('verse reference hidden until reveal completes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSoaking()

    await startExercise(user)

    // Find the reference text (contains "WEB")
    const reference = screen.getByText(/WEB$/i)
    expect(reference).toHaveClass('opacity-0')
  })

  it('reduced motion shows verse immediately', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSoaking()

    await startExercise(user)

    // onRevealComplete fires on next tick → reference visible
    act(() => {
      vi.advanceTimersByTime(1)
    })
    const reference = screen.getByText(/WEB$/i)
    expect(reference).toHaveClass('opacity-100')
  })
})
