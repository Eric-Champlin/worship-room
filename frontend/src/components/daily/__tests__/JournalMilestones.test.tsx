import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { JournalTabContent } from '../JournalTabContent'
import { JOURNAL_MILESTONES_KEY } from '@/constants/daily-experience'

// Mock AudioProvider
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

// Mock useScenePlayer
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

// Mock useFaithPoints
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

// Mock Toast to track showCelebrationToast calls
const mockShowCelebrationToast = vi.fn().mockResolvedValue(undefined)
const mockShowToast = vi.fn()
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
    showCelebrationToast: mockShowCelebrationToast,
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  mockShowCelebrationToast.mockClear()
  mockShowToast.mockClear()
})

function renderJournalTab() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AuthModalProvider>
          <JournalTabContent />
        </AuthModalProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/** Fast entry save using fireEvent (no userEvent delays) */
function saveEntry(content: string) {
  fireEvent.change(screen.getByLabelText('Journal entry'), { target: { value: content } })
  fireEvent.click(screen.getByRole('button', { name: /save entry/i }))
}

/** Save N entries quickly using fireEvent */
function saveEntries(count: number) {
  for (let i = 0; i < count; i++) {
    saveEntry(`Entry ${i + 1} content`)
  }
}

describe('JournalMilestones', () => {
  it('milestone at 10 entries fires celebration toast', () => {
    renderJournalTab()
    saveEntries(10)

    expect(mockShowCelebrationToast).toHaveBeenCalledTimes(1)
    expect(mockShowCelebrationToast).toHaveBeenCalledWith(
      'Journal Milestone',
      '10 entries! Your journal is becoming a treasure.',
      'celebration-confetti',
      expect.anything(),
    )
  })

  it('milestone at 25 entries fires correct message', () => {
    renderJournalTab()
    saveEntries(25)

    // Should have fired at 10 and 25
    expect(mockShowCelebrationToast).toHaveBeenCalledTimes(2)
    expect(mockShowCelebrationToast).toHaveBeenLastCalledWith(
      'Journal Milestone',
      "25 entries! You're building a beautiful record of growth.",
      'celebration-confetti',
      expect.anything(),
    )
  })

  it('milestone fires only once per threshold', () => {
    renderJournalTab()
    saveEntries(11)

    // Only milestone at 10, not at 11
    expect(mockShowCelebrationToast).toHaveBeenCalledTimes(1)
  })

  it('milestone tracked in localStorage', () => {
    renderJournalTab()
    saveEntries(10)

    const celebrated = JSON.parse(localStorage.getItem(JOURNAL_MILESTONES_KEY) ?? '[]')
    expect(celebrated).toContain(10)
  })

  it('non-milestone saves do not fire celebration', () => {
    renderJournalTab()
    saveEntries(5)

    expect(mockShowCelebrationToast).not.toHaveBeenCalled()
  })

  it('milestone uses celebration-confetti type', () => {
    renderJournalTab()
    saveEntries(10)

    expect(mockShowCelebrationToast).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'celebration-confetti',
      expect.anything(),
    )
  })

  it('milestone uses Journal Milestone as badge name', () => {
    renderJournalTab()
    saveEntries(10)

    expect(mockShowCelebrationToast).toHaveBeenCalledWith(
      'Journal Milestone',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })

  it('milestone icon is passed to showCelebrationToast', () => {
    renderJournalTab()
    saveEntries(10)

    // Fourth argument should be a React element (the icon)
    const iconArg = mockShowCelebrationToast.mock.calls[0][3]
    expect(iconArg).toBeTruthy()
  })

  it('previously celebrated milestones are skipped', () => {
    // Pre-set localStorage to indicate 10 was already celebrated
    localStorage.setItem(JOURNAL_MILESTONES_KEY, JSON.stringify([10]))

    renderJournalTab()
    saveEntries(10)

    // 10 was pre-celebrated, so no celebration should fire
    expect(mockShowCelebrationToast).not.toHaveBeenCalled()
  })
})
