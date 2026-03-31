import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { AmbientSoundPill } from '../AmbientSoundPill'
import type { AmbientContext } from '@/constants/ambient-suggestions'

// Mock useScenePlayer
const mockLoadScene = vi.fn()
vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    activeSceneId: null,
    loadScene: mockLoadScene,
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null,
    confirmRoutineInterrupt: vi.fn(),
    cancelRoutineInterrupt: vi.fn(),
  }),
}))

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
  mockLoadScene.mockClear()
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

    it('pill button has aria-expanded=false by default', () => {
      renderPill()
      const pill = screen.getByLabelText('Enhance with sound')
      expect(pill).toHaveAttribute('aria-expanded', 'false')
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

  describe('Panel expand/collapse', () => {
    it('expands suggestion panel on click', async () => {
      const user = userEvent.setup()
      renderPill()
      const pill = screen.getByLabelText('Enhance with sound')
      await user.click(pill)
      expect(screen.getByRole('region', { name: 'Ambient sound suggestions' })).toBeInTheDocument()
      expect(pill).toHaveAttribute('aria-expanded', 'true')
    })

    it('shows 3 scene cards when expanded', async () => {
      const user = userEvent.setup()
      renderPill({ context: 'pray' })
      await user.click(screen.getByLabelText('Enhance with sound'))
      expect(screen.getByText('The Upper Room')).toBeInTheDocument()
      expect(screen.getByText('Ember & Stone')).toBeInTheDocument()
      expect(screen.getByText('Still Waters')).toBeInTheDocument()
    })

    it('shows correct scenes for journal context', async () => {
      const user = userEvent.setup()
      renderPill({ context: 'journal' })
      await user.click(screen.getByLabelText('Enhance with sound'))
      expect(screen.getByText('Midnight Rain')).toBeInTheDocument()
      expect(screen.getByText('Morning Mist')).toBeInTheDocument()
      expect(screen.getByText('Starfield')).toBeInTheDocument()
    })

    it('shows correct scenes for meditate context', async () => {
      const user = userEvent.setup()
      renderPill({ context: 'meditate' })
      await user.click(screen.getByLabelText('Enhance with sound'))
      expect(screen.getByText('Garden of Gethsemane')).toBeInTheDocument()
      expect(screen.getByText('Still Waters')).toBeInTheDocument()
      expect(screen.getByText('Mountain Refuge')).toBeInTheDocument()
    })

    it('collapses on click-outside', async () => {
      // jsdom doesn't implement offsetParent, so mock it on the prototype
      const origDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
        get() { return document.body },
        configurable: true,
      })

      const user = userEvent.setup()
      renderPill()
      const pill = screen.getByLabelText('Enhance with sound')
      await user.click(pill)
      expect(screen.getByRole('region', { name: 'Ambient sound suggestions' })).toBeInTheDocument()

      // fireEvent.mouseDown dispatches directly on document — bypasses userEvent limitations in jsdom
      fireEvent.mouseDown(document)
      expect(screen.queryByRole('region', { name: 'Ambient sound suggestions' })).not.toBeInTheDocument()

      // Restore original
      if (origDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'offsetParent', origDescriptor)
      }
    })

    it('collapses on Escape key and returns focus to pill', async () => {
      const user = userEvent.setup()
      renderPill()
      const pill = screen.getByLabelText('Enhance with sound')
      await user.click(pill)
      expect(screen.getByRole('region', { name: 'Ambient sound suggestions' })).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('region', { name: 'Ambient sound suggestions' })).not.toBeInTheDocument()
      expect(pill).toHaveFocus()
    })
  })

  describe('Scene card interactions', () => {
    it('calls loadScene on scene card click', async () => {
      const user = userEvent.setup()
      renderPill({ context: 'pray' })
      await user.click(screen.getByLabelText('Enhance with sound'))
      await user.click(screen.getByText('The Upper Room'))
      expect(mockLoadScene).toHaveBeenCalledTimes(1)
      expect(mockLoadScene).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'the-upper-room', name: 'The Upper Room' }),
      )
    })

    it('collapses panel after scene card click', async () => {
      const user = userEvent.setup()
      renderPill({ context: 'pray' })
      await user.click(screen.getByLabelText('Enhance with sound'))
      await user.click(screen.getByText('The Upper Room'))

      // Panel collapses after 300ms
      await waitFor(
        () => {
          expect(screen.queryByRole('region', { name: 'Ambient sound suggestions' })).not.toBeInTheDocument()
        },
        { timeout: 1000 },
      )
    })
  })

  describe('Audio drawer toggle', () => {
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

  describe('Accessibility', () => {
    it('pill button has correct aria-controls when idle', async () => {
      const user = userEvent.setup()
      renderPill({ context: 'pray' })
      const pill = screen.getByLabelText('Enhance with sound')
      expect(pill).toHaveAttribute('aria-controls', 'ambient-panel-pray')

      await user.click(pill)
      const panel = screen.getByRole('region', { name: 'Ambient sound suggestions' })
      expect(panel).toHaveAttribute('id', 'ambient-panel-pray')
    })

    it('scene cards are keyboard accessible', async () => {
      const user = userEvent.setup()
      renderPill({ context: 'pray' })
      await user.click(screen.getByLabelText('Enhance with sound'))

      const firstCard = screen.getByLabelText('The Upper Room')
      // <button> elements are natively focusable — no tabindex needed
      expect(firstCard.tagName).toBe('BUTTON')
    })
  })

  describe('"Browse all sounds" link', () => {
    it('links to /music?tab=ambient', async () => {
      const user = userEvent.setup()
      renderPill()
      await user.click(screen.getByLabelText('Enhance with sound'))
      const link = screen.getByText(/Browse all sounds/)
      expect(link).toHaveAttribute('href', '/music?tab=ambient')
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
