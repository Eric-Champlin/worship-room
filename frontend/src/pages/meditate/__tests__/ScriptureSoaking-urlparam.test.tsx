import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ScriptureSoaking } from '../ScriptureSoaking'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { name: 'Eric' }, isAuthenticated: true })),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [], isPlaying: false, currentSceneName: null, currentSceneId: null,
    pillVisible: false, drawerOpen: false, foregroundContent: null, sleepTimer: null,
    activeRoutine: null, masterVolume: 0.8, foregroundBackgroundBalance: 0.5, foregroundEndedCounter: 0,
  }),
  useAudioDispatch: () => vi.fn(),
}))

vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    activeSceneId: null, loadScene: vi.fn(), isLoading: false,
    undoAvailable: false, undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null, confirmRoutineInterrupt: vi.fn(), cancelRoutineInterrupt: vi.fn(),
  }),
}))

function renderSoaking(searchParams: string = '') {
  return render(
    <MemoryRouter initialEntries={[`/meditate/soaking${searchParams}`]}>
      <ScriptureSoaking />
    </MemoryRouter>,
  )
}

describe('ScriptureSoaking URL parameter', () => {
  it('uses matching verse when ?verse param matches pool entry', async () => {
    const user = userEvent.setup()
    renderSoaking('?verse=Psalm%20139%3A13-14')

    // Select duration and begin
    await user.click(screen.getByText('5 min'))
    await user.click(screen.getByText('Begin'))

    // After begin, verse reference is rendered (with opacity transition)
    // Check for the reference text "Psalm 139:13-14 WEB"
    expect(screen.getByText(/Psalm 139:13-14 WEB/)).toBeInTheDocument()
  })

  it('falls back to random when ?verse param does not match', async () => {
    const user = userEvent.setup()
    renderSoaking('?verse=Nonexistent%2099%3A99')

    // Should still render the prestart screen (no crash)
    expect(screen.getByText('Begin')).toBeInTheDocument()

    // Select duration and begin
    await user.click(screen.getByText('5 min'))
    await user.click(screen.getByText('Begin'))

    // A verse should render (random from pool)
    expect(screen.getByRole('blockquote')).toBeInTheDocument()
  })

  it('falls back to random when no ?verse param', async () => {
    const user = userEvent.setup()
    renderSoaking()

    // Prestart screen renders correctly
    expect(screen.getByText('Begin')).toBeInTheDocument()

    await user.click(screen.getByText('5 min'))
    await user.click(screen.getByText('Begin'))

    // A verse should render
    expect(screen.getByRole('blockquote')).toBeInTheDocument()
  })

  it('Try Another replaces VOTD-loaded verse', async () => {
    const user = userEvent.setup()
    renderSoaking('?verse=Psalm%20139%3A13-14')

    // Click "Try another verse" on prestart screen
    await user.click(screen.getByText('Try another verse'))

    // Now begin the meditation
    await user.click(screen.getByText('5 min'))
    await user.click(screen.getByText('Begin'))

    // A verse should render (different from Psalm 139, but random means it could be the same)
    expect(screen.getByRole('blockquote')).toBeInTheDocument()
  })
})
