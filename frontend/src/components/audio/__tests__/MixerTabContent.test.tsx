import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { MixerTabContent } from '../MixerTabContent'
import type { AudioState } from '@/types/audio'

// ── Mocks ────────────────────────────────────────────────────────────

const mockDispatch = vi.fn()
const mockOpenAuthModal = vi.fn()
let mockActiveSounds: AudioState['activeSounds'] = []
let mockIsLoggedIn = true

vi.mock('../AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: mockActiveSounds,
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: null,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: null,
    currentSceneName: null,
    currentSceneId: null,
  }),
  useAudioDispatch: () => mockDispatch,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: mockIsLoggedIn }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('MixerTabContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveSounds = []
    mockIsLoggedIn = true
  })

  it('shows empty state message when no active sounds', () => {
    render(<MemoryRouter><MixerTabContent /></MemoryRouter>)
    expect(
      screen.getByText('Tap a sound on the Ambient Sounds page to start your mix'),
    ).toBeInTheDocument()
  })

  it('renders a row for each active sound with icon, name, and slider', () => {
    mockActiveSounds = [
      { soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' },
      { soundId: 'fireplace', volume: 0.4, label: 'Fireplace' },
    ]
    render(<MemoryRouter><MixerTabContent /></MemoryRouter>)

    expect(screen.getByText('Gentle Rain')).toBeInTheDocument()
    expect(screen.getByText('Fireplace')).toBeInTheDocument()
    expect(screen.getAllByRole('slider')).toHaveLength(2)
  })

  it('volume slider dispatches SET_SOUND_VOLUME on change', () => {
    mockActiveSounds = [{ soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }]
    const { fireEvent } = require('@testing-library/react')
    render(<MemoryRouter><MixerTabContent /></MemoryRouter>)

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '80' } })

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_SOUND_VOLUME',
      payload: { soundId: 'gentle-rain', volume: 0.8 },
    })
  })

  it('remove button dispatches REMOVE_SOUND', async () => {
    mockActiveSounds = [{ soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }]
    const user = userEvent.setup()
    render(<MemoryRouter><MixerTabContent /></MemoryRouter>)

    await user.click(screen.getByLabelText('Remove Gentle Rain'))
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'REMOVE_SOUND',
      payload: { soundId: 'gentle-rain' },
    })
  })

  it('"+ Add Sound" button is visible when sounds are active', () => {
    mockActiveSounds = [{ soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }]
    render(<MemoryRouter><MixerTabContent /></MemoryRouter>)

    expect(screen.getByText('Add Sound')).toBeInTheDocument()
  })

  it('"+ Add Sound" button triggers auth modal when logged out', async () => {
    mockIsLoggedIn = false
    mockActiveSounds = [{ soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }]
    const user = userEvent.setup()
    render(<MemoryRouter><MixerTabContent /></MemoryRouter>)

    await user.click(screen.getByText('Add Sound'))
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to play ambient sounds')
  })
})
