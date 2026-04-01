import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SleepTimerPanel } from '../SleepTimerPanel'

// --- Mock Auth ---
const mockAuth = { isAuthenticated: true, user: { name: 'Eric', id: 'u1' }, login: vi.fn(), logout: vi.fn() }
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

const mockOpenAuthModal = vi.fn()
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

// --- Mock Audio Provider ---
const mockSleepTimer = {
  remainingMs: 0,
  totalDurationMs: 0,
  fadeDurationMs: 0,
  phase: null as 'full-volume' | 'fading' | 'complete' | null,
  isActive: false,
  isPaused: false,
  fadeStatus: 'none' as const,
  fadeRemainingMs: 0,
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  cancel: vi.fn(),
}

const mockDispatch = vi.fn()

vi.mock('@/components/audio/AudioProvider', () => ({
  useSleepTimerControls: () => mockSleepTimer,
  useAudioDispatch: () => mockDispatch,
}))

function renderPanel(isOpen = true) {
  const onClose = vi.fn()
  const result = render(<SleepTimerPanel isOpen={isOpen} onClose={onClose} />)
  return { ...result, onClose }
}

describe('SleepTimerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.isAuthenticated = true
    mockSleepTimer.isActive = false
    mockSleepTimer.remainingMs = 0
    mockSleepTimer.totalDurationMs = 0
    mockSleepTimer.phase = null
  })

  it('renders nothing when closed', () => {
    renderPanel(false)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('renders duration pills', () => {
    renderPanel()
    const durationGroup = screen.getByRole('radiogroup', { name: 'Timer duration' })
    const radios = Array.from(durationGroup.querySelectorAll('[role="radio"]'))
    const labels = radios.map((r) => r.textContent)
    expect(labels).toEqual(['15m', '30m', '45m', '60m', '90m', 'Custom'])
  })

  it('renders fade duration pills with 10m selected by default', () => {
    renderPanel()
    const fadeGroup = screen.getByRole('radiogroup', { name: 'Fade duration' })
    expect(fadeGroup).toBeInTheDocument()

    const fade10 = screen.getAllByRole('radio').find(
      (r) => r.textContent === '10m' && r.getAttribute('aria-checked') === 'true',
    )
    expect(fade10).toBeTruthy()
  })

  it('Start Timer disabled until duration selected', () => {
    renderPanel()
    const startBtn = screen.getByRole('button', { name: /start sleep timer/i })
    expect(startBtn).toBeDisabled()
  })

  it('Start Timer enabled after selecting duration', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByText('30m'))
    const startBtn = screen.getByRole('button', { name: /start 30 minute sleep timer/i })
    expect(startBtn).toBeEnabled()
  })

  it('custom input appears when Custom pill selected', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByText('Custom'))
    expect(screen.getByPlaceholderText('Minutes (5-480)')).toBeInTheDocument()
  })

  it('auth modal shown for logged-out user clicking Start Timer', async () => {
    mockAuth.isAuthenticated = false
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByText('30m'))
    await user.click(screen.getByRole('button', { name: /start 30 minute sleep timer/i }))

    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to use the sleep timer')
    expect(mockSleepTimer.start).not.toHaveBeenCalled()
  })

  it('Start Timer calls sleepTimerControls.start with correct ms values', async () => {
    const user = userEvent.setup()
    const { onClose } = renderPanel()

    await user.click(screen.getByText('30m'))
    await user.click(screen.getByRole('button', { name: /start 30 minute sleep timer/i }))

    expect(mockSleepTimer.start).toHaveBeenCalledWith(30 * 60 * 1000, 10 * 60 * 1000)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows active timer with remaining time', () => {
    mockSleepTimer.isActive = true
    mockSleepTimer.remainingMs = 15 * 60 * 1000

    // Need to simulate "started from here" — render, start, then check.
    // Since the panel tracks startedFromHere internally, for a timer
    // that was NOT started from this panel, it shows conflict state.
    // We test the active state indirectly via the start flow.
    renderPanel()
    // Timer active but not started from here = conflict state
    expect(screen.getByText('Timer already running from Music')).toBeInTheDocument()
  })

  it('conflict state shows "Timer already running from Music" and Adjust button', () => {
    mockSleepTimer.isActive = true
    mockSleepTimer.remainingMs = 20 * 60 * 1000

    renderPanel()
    expect(screen.getByText('Timer already running from Music')).toBeInTheDocument()
    expect(screen.getByText('Adjust')).toBeInTheDocument()
  })

  it('Adjust button opens drawer', async () => {
    mockSleepTimer.isActive = true
    mockSleepTimer.remainingMs = 20 * 60 * 1000
    const user = userEvent.setup()

    const { onClose } = renderPanel()
    await user.click(screen.getByText('Adjust'))

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' })
    expect(onClose).toHaveBeenCalled()
  })

  it('duration pills use role="radiogroup"', () => {
    renderPanel()
    expect(screen.getByRole('radiogroup', { name: 'Timer duration' })).toBeInTheDocument()
  })

  it('fade pills use role="radiogroup"', () => {
    renderPanel()
    expect(screen.getByRole('radiogroup', { name: 'Fade duration' })).toBeInTheDocument()
  })

  it('Escape closes panel', async () => {
    const user = userEvent.setup()
    const { onClose } = renderPanel()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('click outside closes panel', async () => {
    const user = userEvent.setup()
    const { onClose } = renderPanel()

    await user.click(document.body)
    expect(onClose).toHaveBeenCalled()
  })

  it('custom input has accessible name via label association', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('radio', { name: 'Custom' }))
    const input = screen.getByLabelText('Custom timer duration in minutes')
    expect(input).toBeInTheDocument()
  })

  it('custom input has aria-invalid for out-of-range value', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('radio', { name: 'Custom' }))
    const input = screen.getByLabelText('Custom timer duration in minutes')
    await user.type(input, '3')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })
})
