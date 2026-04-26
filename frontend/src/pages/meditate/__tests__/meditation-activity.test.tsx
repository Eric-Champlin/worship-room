import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ExamenReflection } from '../ExamenReflection'

// Mock useFaithPoints to spy on recordActivity
const mockRecordActivity = vi.fn()
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
    recordActivity: mockRecordActivity,
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

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  mockRecordActivity.mockClear()
})

describe('Meditation activity integration', () => {
  it('recordActivity("meditate") called on ExamenReflection completion', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter
        initialEntries={['/meditate/examen']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthProvider>
          <Routes>
            <Route path="/meditate/examen" element={<ExamenReflection />} />
            <Route path="/daily" element={<div>Daily Hub</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Navigate through all 5 Examen steps
    // Steps: 1 → 2 → 3 → 4 → 5 (last step has "Finish" button)
    for (let i = 0; i < 4; i++) {
      const nextBtn = screen.getByRole('button', { name: 'Next step' })
      await user.click(nextBtn)
    }

    // Click Finish on the last step
    const finishBtn = screen.getByRole('button', { name: /finish/i })
    await user.click(finishBtn)

    expect(mockRecordActivity).toHaveBeenCalledWith('meditate', 'meditate')
  })
})
