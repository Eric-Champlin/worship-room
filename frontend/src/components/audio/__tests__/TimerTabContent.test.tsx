import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TimerTabContent } from '../TimerTabContent'

// ── Mocks ────────────────────────────────────────────────────────────

const mockStart = vi.fn()
const mockPause = vi.fn()
const mockResume = vi.fn()
const mockCancel = vi.fn()
const mockShowToast = vi.fn()
const mockOpenAuthModal = vi.fn()

let mockIsLoggedIn = false
let mockControls: Record<string, unknown> = {}

vi.mock('../AudioProvider', () => ({
  useSleepTimerControls: () => mockControls,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isLoggedIn: mockIsLoggedIn, user: null }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

function inactiveControls(overrides: Record<string, unknown> = {}) {
  return {
    remainingMs: 0,
    totalDurationMs: 0,
    fadeDurationMs: 0,
    phase: null,
    isActive: false,
    isPaused: false,
    fadeStatus: 'none',
    fadeRemainingMs: 0,
    start: mockStart,
    pause: mockPause,
    resume: mockResume,
    cancel: mockCancel,
    ...overrides,
  }
}

function activeControls(overrides: Record<string, unknown> = {}) {
  return {
    remainingMs: 45 * 60 * 1000, // 45 min
    totalDurationMs: 60 * 60 * 1000, // 60 min
    fadeDurationMs: 10 * 60 * 1000, // 10 min
    phase: 'full-volume',
    isActive: true,
    isPaused: false,
    fadeStatus: 'none',
    fadeRemainingMs: 35 * 60 * 1000,
    start: mockStart,
    pause: mockPause,
    resume: mockResume,
    cancel: mockCancel,
    ...overrides,
  }
}

describe('TimerTabContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoggedIn = false
    mockControls = inactiveControls()
  })

  // ── Setup View ──────────────────────────────────────────────────────

  describe('Setup View', () => {
    it('renders preset duration buttons (15, 30, 45, 60, 90)', () => {
      render(<TimerTabContent />)
      const timerGroup = within(screen.getByRole('radiogroup', { name: 'Timer duration' }))
      expect(timerGroup.getByRole('radio', { name: '15 min' })).toBeInTheDocument()
      expect(timerGroup.getByRole('radio', { name: '30 min' })).toBeInTheDocument()
      expect(timerGroup.getByRole('radio', { name: '45 min' })).toBeInTheDocument()
      expect(timerGroup.getByRole('radio', { name: '60 min' })).toBeInTheDocument()
      expect(timerGroup.getByRole('radio', { name: '90 min' })).toBeInTheDocument()
    })

    it('renders Custom button', () => {
      render(<TimerTabContent />)
      const timerGroup = within(screen.getByRole('radiogroup', { name: 'Timer duration' }))
      expect(timerGroup.getByRole('radio', { name: 'Custom' })).toBeInTheDocument()
    })

    it('selecting preset highlights it', async () => {
      const user = userEvent.setup()
      render(<TimerTabContent />)
      const timerGroup = within(screen.getByRole('radiogroup', { name: 'Timer duration' }))

      const btn30 = timerGroup.getByRole('radio', { name: '30 min' })
      await user.click(btn30)
      expect(btn30).toHaveAttribute('aria-checked', 'true')

      // Others should be unchecked
      expect(timerGroup.getByRole('radio', { name: '15 min' })).toHaveAttribute('aria-checked', 'false')
    })

    it('selecting Custom shows input and deselects presets', async () => {
      const user = userEvent.setup()
      render(<TimerTabContent />)
      const timerGroup = within(screen.getByRole('radiogroup', { name: 'Timer duration' }))

      await user.click(timerGroup.getByRole('radio', { name: 'Custom' }))
      expect(screen.getByLabelText('Custom timer duration in minutes')).toBeInTheDocument()
      expect(timerGroup.getByRole('radio', { name: 'Custom' })).toHaveAttribute('aria-checked', 'true')
    })

    it('renders fade preset buttons with 10 default selected', () => {
      render(<TimerTabContent />)
      const fadeGroup = screen.getByRole('radiogroup', { name: 'Fade duration' })
      const btn10 = fadeGroup.querySelector('[aria-checked="true"]')!
      expect(btn10).toHaveTextContent('10 min')
    })

    it('Start Timer disabled when no duration selected', () => {
      render(<TimerTabContent />)
      const startBtn = screen.getByRole('button', { name: /Select a timer duration/i })
      expect(startBtn).toBeDisabled()
    })

    it('Start Timer enabled after selecting duration', async () => {
      const user = userEvent.setup()
      render(<TimerTabContent />)
      const timerGroup = within(screen.getByRole('radiogroup', { name: 'Timer duration' }))

      await user.click(timerGroup.getByRole('radio', { name: '30 min' }))
      const startBtn = screen.getByRole('button', { name: /Start sleep timer/i })
      expect(startBtn).not.toBeDisabled()
    })

    it('timer preset buttons use role="radiogroup"', () => {
      render(<TimerTabContent />)
      expect(screen.getByRole('radiogroup', { name: 'Timer duration' })).toBeInTheDocument()
    })

    it('fade preset buttons use role="radiogroup"', () => {
      render(<TimerTabContent />)
      expect(screen.getByRole('radiogroup', { name: 'Fade duration' })).toBeInTheDocument()
    })

    it('responsive: mobile wraps to grid-cols-3', () => {
      render(<TimerTabContent />)
      const timerGroup = screen.getByRole('radiogroup', { name: 'Timer duration' })
      expect(timerGroup.className).toContain('grid-cols-3')
    })
  })

  // ── Fade Auto-Adjustment ────────────────────────────────────────────

  describe('Fade auto-adjustment', () => {
    it('adjusts fade when fade >= timer duration', async () => {
      const user = userEvent.setup()
      render(<TimerTabContent />)

      // Select 15 min timer
      const timerGroup = within(screen.getByRole('radiogroup', { name: 'Timer duration' }))
      await user.click(timerGroup.getByRole('radio', { name: '15 min' }))

      // Default fade is 10 which is < 15, OK
      // Now try to set fade to 15 (= timer)
      const fadeGroup = within(screen.getByRole('radiogroup', { name: 'Fade duration' }))
      await user.click(fadeGroup.getByRole('radio', { name: '15 min' }))

      // Fade should auto-adjust and toast shown
      expect(mockShowToast).toHaveBeenCalledWith('Fade adjusted to fit timer')
    })
  })

  // ── Auth Gating ────────────────────────────────────────────────────

  describe('Auth gating', () => {
    it('triggers auth modal when logged out', async () => {
      mockIsLoggedIn = false
      const user = userEvent.setup()
      render(<TimerTabContent />)

      const timerGroup = within(screen.getByRole('radiogroup', { name: 'Timer duration' }))
      await user.click(timerGroup.getByRole('radio', { name: '30 min' }))
      await user.click(screen.getByRole('button', { name: /Start sleep timer/i }))

      expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to use the sleep timer')
      expect(mockStart).not.toHaveBeenCalled()
    })

    it('calls start when logged in', async () => {
      mockIsLoggedIn = true
      const user = userEvent.setup()
      render(<TimerTabContent />)

      const timerGroup = within(screen.getByRole('radiogroup', { name: 'Timer duration' }))
      await user.click(timerGroup.getByRole('radio', { name: '30 min' }))
      await user.click(screen.getByRole('button', { name: /Start sleep timer/i }))

      expect(mockStart).toHaveBeenCalledWith(30 * 60 * 1000, 10 * 60 * 1000)
      expect(mockOpenAuthModal).not.toHaveBeenCalled()
    })
  })

  // ── Active Countdown View ──────────────────────────────────────────

  describe('Active Countdown View', () => {
    beforeEach(() => {
      mockControls = activeControls()
    })

    it('shows countdown display with mm:ss remaining', () => {
      render(<TimerTabContent />)
      expect(screen.getByText('45:00')).toBeInTheDocument()
      expect(screen.getByText('remaining')).toBeInTheDocument()
    })

    it('shows Pause button', () => {
      render(<TimerTabContent />)
      expect(screen.getByRole('button', { name: 'Pause sleep timer' })).toBeInTheDocument()
    })

    it('shows Cancel button', () => {
      render(<TimerTabContent />)
      expect(screen.getByRole('button', { name: 'Cancel sleep timer' })).toBeInTheDocument()
    })

    it('clicking Pause dispatches pause', async () => {
      const user = userEvent.setup()
      render(<TimerTabContent />)
      await user.click(screen.getByRole('button', { name: 'Pause sleep timer' }))
      expect(mockPause).toHaveBeenCalled()
    })

    it('clicking Cancel dispatches cancel', async () => {
      const user = userEvent.setup()
      render(<TimerTabContent />)
      await user.click(screen.getByRole('button', { name: 'Cancel sleep timer' }))
      expect(mockCancel).toHaveBeenCalled()
    })

    it('shows Resume button when paused', () => {
      mockControls = activeControls({ isPaused: true })
      render(<TimerTabContent />)
      expect(screen.getByRole('button', { name: 'Resume sleep timer' })).toBeInTheDocument()
    })

    it('shows read-only fade display', () => {
      render(<TimerTabContent />)
      expect(screen.getByText('Fade: 10 min')).toBeInTheDocument()
    })
  })

  // ── Fade Status ────────────────────────────────────────────────────

  describe('Fade status text', () => {
    it('shows "Fading in" when approaching', () => {
      mockControls = activeControls({
        fadeStatus: 'approaching',
        fadeRemainingMs: 5 * 60 * 1000,
      })
      render(<TimerTabContent />)
      expect(screen.getByText(/Fading in 5:00/)).toBeInTheDocument()
    })

    it('shows "Fading now..." when fading', () => {
      mockControls = activeControls({ fadeStatus: 'fading' })
      render(<TimerTabContent />)
      const fadingText = screen.getByText('Fading now...')
      expect(fadingText).toBeInTheDocument()
      expect(fadingText).toHaveAttribute('aria-live', 'assertive')
    })

    it('does not show fade status when none', () => {
      mockControls = activeControls({ fadeStatus: 'none' })
      render(<TimerTabContent />)
      expect(screen.queryByText(/Fading/)).not.toBeInTheDocument()
    })
  })

  // ── Countdown aria-live ────────────────────────────────────────────

  describe('Countdown accessibility', () => {
    it('has sr-only aria-live region', () => {
      mockControls = activeControls()
      render(<TimerTabContent />)
      const liveRegion = document.querySelector('[aria-live="polite"].sr-only')
      expect(liveRegion).toBeInTheDocument()
    })
  })
})
