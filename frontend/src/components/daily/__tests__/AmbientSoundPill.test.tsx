import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { AmbientSoundPill } from '../AmbientSoundPill'
import type { AmbientContext } from '@/constants/ambient-suggestions'

// Mock useAudioState — default: no audio playing
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
  // Reset audio state to defaults
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

function renderPill(props: { context?: AmbientContext; variant?: 'light' | 'dark'; visible?: boolean; className?: string } = {}) {
  const { context = 'pray', ...rest } = props
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <AmbientSoundPill context={context} {...rest} />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AmbientSoundPill', () => {
  describe('Idle state', () => {
    it('renders idle pill with Music icon and "Enhance with sound"', () => {
      renderPill()
      expect(screen.getByText('Enhance with sound')).toBeInTheDocument()
      expect(screen.getByLabelText('Enhance with sound')).toBeInTheDocument()
    })

    it('does not have aria-expanded attribute', () => {
      renderPill()
      const pill = screen.getByLabelText('Enhance with sound')
      expect(pill).not.toHaveAttribute('aria-expanded')
    })
  })

  describe('Playing state', () => {
    it('renders playing pill with scene name', () => {
      mockAudioState.activeSounds = [{ soundId: 'test', volume: 0.5, label: 'Test' }]
      mockAudioState.pillVisible = true
      mockAudioState.currentSceneName = 'Still Waters'
      renderPill()
      expect(screen.getByText('Playing: Still Waters')).toBeInTheDocument()
    })

    it('renders "Custom mix" when no scene name', () => {
      mockAudioState.activeSounds = [{ soundId: 'test', volume: 0.5, label: 'Test' }]
      mockAudioState.pillVisible = true
      mockAudioState.currentSceneName = null
      renderPill()
      expect(screen.getByText('Playing: Custom mix')).toBeInTheDocument()
    })

    it('waveform bars have aria-hidden', () => {
      mockAudioState.activeSounds = [{ soundId: 'test', volume: 0.5, label: 'Test' }]
      mockAudioState.pillVisible = true
      renderPill()
      const waveform = screen.getByLabelText(/Playing/).querySelector('[aria-hidden="true"]')
      expect(waveform).toBeInTheDocument()
    })
  })

  describe('Audio drawer toggle', () => {
    it('dispatches OPEN_DRAWER when idle pill clicked and drawer closed', async () => {
      const user = userEvent.setup()
      mockAudioState.drawerOpen = false
      renderPill()
      await user.click(screen.getByLabelText('Enhance with sound'))
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' })
    })

    it('dispatches CLOSE_DRAWER when idle pill clicked and drawer open', async () => {
      const user = userEvent.setup()
      mockAudioState.drawerOpen = true
      renderPill()
      await user.click(screen.getByLabelText('Enhance with sound'))
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLOSE_DRAWER' })
    })

    it('dispatches OPEN_DRAWER when playing pill clicked and drawer closed', async () => {
      const user = userEvent.setup()
      mockAudioState.activeSounds = [{ soundId: 'test', volume: 0.5, label: 'Test' }]
      mockAudioState.pillVisible = true
      mockAudioState.drawerOpen = false
      renderPill()
      await user.click(screen.getByLabelText(/Playing/))
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' })
    })

    it('dispatches CLOSE_DRAWER when playing pill clicked and drawer open', async () => {
      const user = userEvent.setup()
      mockAudioState.activeSounds = [{ soundId: 'test', volume: 0.5, label: 'Test' }]
      mockAudioState.pillVisible = true
      mockAudioState.drawerOpen = true
      renderPill()
      await user.click(screen.getByLabelText(/Playing/))
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLOSE_DRAWER' })
    })
  })

  describe('Visibility', () => {
    it('renders nothing when visible=false', () => {
      renderPill({ visible: false })
      expect(screen.queryByText('Enhance with sound')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Enhance with sound')).not.toBeInTheDocument()
    })

    it('renders normally when visible=true', () => {
      renderPill({ visible: true })
      expect(screen.getByText('Enhance with sound')).toBeInTheDocument()
    })

    it('renders normally when visible is undefined (default)', () => {
      renderPill()
      expect(screen.getByText('Enhance with sound')).toBeInTheDocument()
    })
  })

  describe('className prop', () => {
    it('applies custom className to root container', () => {
      renderPill({ className: 'mb-0' })
      const pill = screen.getByLabelText('Enhance with sound')
      const container = pill.closest('div')
      expect(container).toHaveClass('mb-0')
      expect(container).not.toHaveClass('mb-4')
    })

    it('uses default mb-4 when no className provided', () => {
      renderPill()
      const pill = screen.getByLabelText('Enhance with sound')
      const container = pill.closest('div')
      expect(container).toHaveClass('mb-4')
    })
  })

  describe('Reduced motion', () => {
    it('waveform bars have no animation class when reduced motion preferred', () => {
      // Mock matchMedia for reduced motion
      const originalMatchMedia = window.matchMedia
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
        dispatchEvent: vi.fn(),
      }))

      mockAudioState.activeSounds = [{ soundId: 'test', volume: 0.5, label: 'Test' }]
      mockAudioState.pillVisible = true
      renderPill()

      const pill = screen.getByLabelText(/Playing/)
      const bars = pill.querySelectorAll('[aria-hidden="true"] span')
      for (const bar of bars) {
        expect(bar.className).not.toContain('animate-waveform')
      }

      window.matchMedia = originalMatchMedia
    })
  })
})
