import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResumePrompt } from '../ResumePrompt'
import type { SessionState } from '@/types/storage'

// ── Mocks ────────────────────────────────────────────────────────────

let mockIsLoggedIn = false
let mockHasValidSession = false
let mockSessionState: SessionState | null = null
const mockClearSession = vi.fn()
const mockSaveSession = vi.fn()
const mockDispatch = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: mockIsLoggedIn }),
}))

vi.mock('@/hooks/useSessionPersistence', () => ({
  useSessionPersistence: () => ({
    sessionState: mockSessionState,
    hasValidSession: mockHasValidSession,
    saveSession: mockSaveSession,
    clearSession: mockClearSession,
  }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioDispatch: () => mockDispatch,
  useAudioEngine: () => ({
    addSound: vi.fn().mockResolvedValue(undefined),
    removeSound: vi.fn(),
  }),
}))

vi.mock('@/data/sound-catalog', () => ({
  SOUND_BY_ID: new Map([
    ['gentle-rain', { id: 'gentle-rain', name: 'Gentle Rain', lucideIcon: 'CloudRain', filename: 'rain-gentle.mp3' }],
  ]),
}))

// ── Test data ────────────────────────────────────────────────────────

const VALID_SESSION: SessionState = {
  activeSounds: [{ soundId: 'gentle-rain', volume: 0.7 }],
  foregroundContentId: null,
  foregroundPosition: 0,
  masterVolume: 0.8,
  savedAt: new Date().toISOString(),
}

// ── Tests ────────────────────────────────────────────────────────────

describe('ResumePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoggedIn = false
    mockHasValidSession = false
    mockSessionState = null
  })

  it('not rendered when logged out', () => {
    const { container } = render(<ResumePrompt />)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('not rendered when no session state', () => {
    mockIsLoggedIn = true
    const { container } = render(<ResumePrompt />)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('not rendered when session > 24 hours old', () => {
    mockIsLoggedIn = true
    mockHasValidSession = false
    mockSessionState = null
    const { container } = render(<ResumePrompt />)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('renders banner with "Welcome back!" text', () => {
    mockIsLoggedIn = true
    mockHasValidSession = true
    mockSessionState = VALID_SESSION

    render(<ResumePrompt />)
    expect(
      screen.getByText('Welcome back! Resume your last session?'),
    ).toBeInTheDocument()
  })

  it('has role="alert"', () => {
    mockIsLoggedIn = true
    mockHasValidSession = true
    mockSessionState = VALID_SESSION

    render(<ResumePrompt />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('"Resume" button loads saved state', async () => {
    mockIsLoggedIn = true
    mockHasValidSession = true
    mockSessionState = VALID_SESSION
    const user = userEvent.setup()

    render(<ResumePrompt />)
    await user.click(screen.getByText('Resume'))

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_MASTER_VOLUME',
      payload: { volume: 0.8 },
    })
    expect(mockClearSession).toHaveBeenCalled()
  })

  it('"Dismiss" clears state and hides', async () => {
    mockIsLoggedIn = true
    mockHasValidSession = true
    mockSessionState = VALID_SESSION
    const user = userEvent.setup()

    render(<ResumePrompt />)
    await user.click(screen.getByText('Dismiss'))

    expect(mockClearSession).toHaveBeenCalled()
  })

  it('auto-focuses "Resume" button', () => {
    mockIsLoggedIn = true
    mockHasValidSession = true
    mockSessionState = VALID_SESSION

    render(<ResumePrompt />)
    expect(screen.getByText('Resume')).toHaveFocus()
  })
})
