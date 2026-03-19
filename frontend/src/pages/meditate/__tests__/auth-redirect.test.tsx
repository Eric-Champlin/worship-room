import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { BreathingExercise } from '../BreathingExercise'
import { ScriptureSoaking } from '../ScriptureSoaking'
import { GratitudeReflection } from '../GratitudeReflection'
import { ActsPrayerWalk } from '../ActsPrayerWalk'
import { PsalmReading } from '../PsalmReading'
import { ExamenReflection } from '../ExamenReflection'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false })),
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

// Mock AudioProvider (needed by AmbientSoundPill embedded in meditation sub-pages)
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

// Mock useScenePlayer (needed by AmbientSoundPill)
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

const { useAuth } = await import('@/hooks/useAuth')
const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

function renderWithRouter(path: string, Component: React.ComponentType) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path={path} element={<Component />} />
        <Route path="/daily" element={<div data-testid="daily-hub">Daily Hub</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const subPages = [
  { name: 'BreathingExercise', path: '/meditate/breathing', Component: BreathingExercise },
  { name: 'ScriptureSoaking', path: '/meditate/soaking', Component: ScriptureSoaking },
  { name: 'GratitudeReflection', path: '/meditate/gratitude', Component: GratitudeReflection },
  { name: 'ActsPrayerWalk', path: '/meditate/acts', Component: ActsPrayerWalk },
  { name: 'PsalmReading', path: '/meditate/psalms', Component: PsalmReading },
  { name: 'ExamenReflection', path: '/meditate/examen', Component: ExamenReflection },
]

describe('Meditation sub-page auth redirect', () => {
  it.each(subPages)(
    '$name redirects to /daily?tab=meditate when logged out',
    ({ path, Component }) => {
      renderWithRouter(path, Component)
      expect(screen.getByTestId('daily-hub')).toBeInTheDocument()
    },
  )

  it.each(subPages)(
    '$name renders content when logged in',
    ({ path, Component }) => {
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: true, login: vi.fn(), logout: vi.fn() })
      renderWithRouter(path, Component)
      expect(screen.queryByTestId('daily-hub')).not.toBeInTheDocument()
      // Verify component actually rendered content (not an empty tree)
      expect(document.body.textContent?.trim().length).toBeGreaterThan(0)
    },
  )
})
