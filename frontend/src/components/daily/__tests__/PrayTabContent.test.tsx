import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayTabContent } from '../PrayTabContent'

// Mock AudioProvider (needed by AmbientSoundPill embedded in PrayTabContent)
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

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  mockRecordActivity.mockClear()
})

function renderPrayTab() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <PrayTabContent />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('PrayTabContent activity integration', () => {
  it('recordActivity("pray") called after prayer generation', async () => {
    const user = userEvent.setup()
    renderPrayTab()

    const textarea = screen.getByLabelText('Prayer request')
    await user.type(textarea, 'I am feeling anxious')

    const generateBtn = screen.getByRole('button', { name: /generate prayer/i })
    await user.click(generateBtn)

    // Wait for the 1500ms setTimeout to fire and prayer to appear
    await waitFor(
      () => {
        expect(mockRecordActivity).toHaveBeenCalledWith('pray')
      },
      { timeout: 3000 },
    )
  })

  it('recordActivity not called on generate failure (empty text)', async () => {
    const user = userEvent.setup()
    renderPrayTab()

    const generateBtn = screen.getByRole('button', { name: /generate prayer/i })
    await user.click(generateBtn)

    // Empty text triggers nudge, no setTimeout fires
    expect(mockRecordActivity).not.toHaveBeenCalled()
    // Verify nudge appeared instead
    expect(screen.getByText(/Tell God what/)).toBeInTheDocument()
  })
})
