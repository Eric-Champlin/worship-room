import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Dashboard } from '@/pages/Dashboard'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'

vi.mock('@/hooks/useWhisperToast', () => ({
  useWhisperToast: () => ({ showWhisperToast: vi.fn() }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { name: 'Eric', id: 'test-id' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, readingPlan: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    newlyEarnedBadges: [],
    recordActivity: vi.fn(),
    clearNewlyEarnedBadges: vi.fn(),
  }),
}))

// Mock AudioProvider (needed by AmbientSoundPill embedded in tab content components)
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

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
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
  localStorage.setItem('wr_onboarding_complete', 'true')
  // Seed mood entry so dashboard shows (not check-in)
  const entry: MoodEntry = {
    id: 'test-1',
    date: getLocalDateString(),
    mood: 4,
    moodLabel: 'Good',
    text: '',
    timestamp: Date.now(),
    verseSeen: 'Psalm 107:1',
  }
  localStorage.setItem('wr_mood_entries', JSON.stringify([entry]))
})

function renderDashboard() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <Dashboard />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Accessibility', () => {
  it('Dashboard has main landmark', () => {
    renderDashboard()
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main-content')
  })

  it('Cards use section with aria-labelledby', () => {
    renderDashboard()
    const sections = document.querySelectorAll('section[aria-labelledby]')
    expect(sections.length).toBeGreaterThanOrEqual(5) // hero + 5 widget cards
  })

  it('Collapse toggle has aria-expanded', () => {
    renderDashboard()
    const collapseButtons = screen.getAllByRole('button', { name: /collapse/i })
    collapseButtons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-expanded')
    })
  })

  it('Avatar dropdown has aria-haspopup', () => {
    renderDashboard()
    const avatar = screen.getByLabelText('User menu')
    expect(avatar).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('Skip-to-content link exists', () => {
    renderDashboard()
    const skipLink = document.querySelector('a[href="#main-content"]')
    expect(skipLink).toBeInTheDocument()
  })

  it('All buttons have accessible names', () => {
    renderDashboard()
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      const name = btn.getAttribute('aria-label') || btn.textContent?.trim()
      expect(name).toBeTruthy()
    })
  })
})
