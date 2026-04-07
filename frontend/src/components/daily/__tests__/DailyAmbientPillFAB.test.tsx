import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { DailyAmbientPillFAB } from '../DailyAmbientPillFAB'

// Mock useAudioState — default: drawer closed
let mockAudioState = {
  activeSounds: [] as { soundId: string; volume: number; label: string }[],
  isPlaying: false,
  currentSceneName: null as string | null,
  currentSceneId: null as string | null,
  pillVisible: false,
  drawerOpen: false,
  foregroundContent: null,
  sleepTimer: null,
  activeRoutine: null,
  masterVolume: 0.8,
  foregroundBackgroundBalance: 0.5,
  foregroundEndedCounter: 0,
}
const mockDispatch = vi.fn()
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockAudioState,
  useAudioDispatch: () => mockDispatch,
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

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  mockDispatch.mockClear()
  mockAudioState = {
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
  }
})

function renderFAB(context: 'pray' | 'journal' | 'meditate' = 'pray') {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <DailyAmbientPillFAB context={context} />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('DailyAmbientPillFAB', () => {
  it('renders the AmbientSoundPill inside the FAB wrapper', () => {
    renderFAB()
    expect(screen.getByLabelText('Enhance with sound')).toBeInTheDocument()
  })

  it('is visible when drawer is closed (opacity-100)', () => {
    mockAudioState.drawerOpen = false
    renderFAB()
    const wrapper = screen.getByLabelText('Enhance with sound').closest('.fixed')
    expect(wrapper).toHaveClass('opacity-100')
    expect(wrapper).not.toHaveClass('opacity-0')
    expect(wrapper).toHaveAttribute('aria-hidden', 'false')
  })

  it('is hidden when drawer is open (opacity-0, aria-hidden, pointer-events-none)', () => {
    mockAudioState.drawerOpen = true
    renderFAB()
    const wrapper = screen.getByLabelText('Enhance with sound').closest('.fixed')
    expect(wrapper).toHaveClass('opacity-0')
    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
    // Inner div should block pointer events
    const innerDiv = wrapper?.querySelector('.pointer-events-none:not(.fixed)')
    expect(innerDiv).toBeInTheDocument()
  })

  it('has fixed positioning with z-40', () => {
    renderFAB()
    const wrapper = screen.getByLabelText('Enhance with sound').closest('.fixed')
    expect(wrapper).toHaveClass('fixed', 'z-40')
  })

  it('applies drop shadow to the pill', () => {
    renderFAB()
    const pill = screen.getByLabelText('Enhance with sound')
    const container = pill.closest('div')
    expect(container).toHaveClass('shadow-[0_4px_20px_rgba(0,0,0,0.4)]')
  })

  it('passes context prop through to AmbientSoundPill', () => {
    // Verifying it renders without error for each context type
    const { unmount } = renderFAB('pray')
    expect(screen.getByLabelText('Enhance with sound')).toBeInTheDocument()
    unmount()

    renderFAB('journal')
    expect(screen.getByLabelText('Enhance with sound')).toBeInTheDocument()
  })
})
