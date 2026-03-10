import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SaveMixButton } from '../SaveMixButton'

// ── Mocks ────────────────────────────────────────────────────────────

const mockOpenAuthModal = vi.fn()
const mockShowToast = vi.fn()
const mockSaveMix = vi.fn()
let mockIsLoggedIn = false

let mockActiveSounds: { soundId: string; volume: number; label: string }[] = []
let mockCurrentSceneName: string | null = null

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: mockIsLoggedIn }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

vi.mock('@/hooks/useSavedMixes', () => ({
  useSavedMixes: () => ({
    mixes: [],
    saveMix: mockSaveMix,
    updateName: vi.fn(),
    deleteMix: vi.fn(),
    duplicateMix: vi.fn(),
  }),
}))

vi.mock('../AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: mockActiveSounds,
    currentSceneName: mockCurrentSceneName,
    masterVolume: 0.8,
    isPlaying: true,
    pillVisible: true,
    drawerOpen: true,
    foregroundContent: null,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: null,
  }),
}))

vi.mock('@/data/scenes', () => ({
  SCENE_PRESETS: [
    {
      id: 'morning-mist',
      name: 'Morning Mist',
      description: 'test',
      artworkFilename: 'test.svg',
      sounds: [
        { soundId: 'gentle-rain', volume: 0.7 },
        { soundId: 'birdsong', volume: 0.5 },
      ],
      tags: { mood: [], activity: [], intensity: 'very_calm' },
      animationCategory: 'drift',
    },
  ],
}))

vi.mock('@/data/sound-catalog', () => ({
  SOUND_BY_ID: new Map([
    ['gentle-rain', { id: 'gentle-rain', name: 'Gentle Rain' }],
    ['birdsong', { id: 'birdsong', name: 'Birdsong' }],
    ['fireplace', { id: 'fireplace', name: 'Fireplace' }],
  ]),
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('SaveMixButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoggedIn = false
    mockActiveSounds = []
    mockCurrentSceneName = null
  })

  it('not visible when no sounds active', () => {
    const { container } = render(<SaveMixButton />)
    expect(container.firstChild).toBeNull()
  })

  it('not visible when unmodified scene is playing', () => {
    mockActiveSounds = [
      { soundId: 'gentle-rain', volume: 0.7, label: 'Gentle Rain' },
      { soundId: 'birdsong', volume: 0.5, label: 'Birdsong' },
    ]
    mockCurrentSceneName = 'Morning Mist'

    const { container } = render(<SaveMixButton />)
    expect(container.querySelector('[aria-label="Save this mix"]')).toBeNull()
  })

  it('visible when custom mix is playing', () => {
    mockActiveSounds = [
      { soundId: 'gentle-rain', volume: 0.7, label: 'Gentle Rain' },
      { soundId: 'fireplace', volume: 0.5, label: 'Fireplace' },
    ]

    render(<SaveMixButton />)
    expect(screen.getByLabelText('Save this mix')).toBeInTheDocument()
  })

  it('visible when scene is modified (different volumes)', () => {
    mockActiveSounds = [
      { soundId: 'gentle-rain', volume: 0.3, label: 'Gentle Rain' },
      { soundId: 'birdsong', volume: 0.5, label: 'Birdsong' },
    ]
    mockCurrentSceneName = 'Morning Mist'

    render(<SaveMixButton />)
    expect(screen.getByLabelText('Save this mix')).toBeInTheDocument()
  })

  it('opens auth modal when logged out', async () => {
    mockActiveSounds = [
      { soundId: 'gentle-rain', volume: 0.7, label: 'Gentle Rain' },
    ]
    const user = userEvent.setup()

    render(<SaveMixButton />)
    await user.click(screen.getByLabelText('Save this mix'))

    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to save your mix')
  })

  it('shows inline input when clicked (logged in)', async () => {
    mockIsLoggedIn = true
    mockActiveSounds = [
      { soundId: 'gentle-rain', volume: 0.7, label: 'Gentle Rain' },
    ]
    const user = userEvent.setup()

    render(<SaveMixButton />)
    await user.click(screen.getByLabelText('Save this mix'))

    expect(screen.getByLabelText('Name your mix')).toBeInTheDocument()
  })

  it('pre-populates name from scene name', async () => {
    mockIsLoggedIn = true
    mockActiveSounds = [
      { soundId: 'gentle-rain', volume: 0.3, label: 'Gentle Rain' },
      { soundId: 'birdsong', volume: 0.5, label: 'Birdsong' },
    ]
    mockCurrentSceneName = 'Morning Mist'
    const user = userEvent.setup()

    render(<SaveMixButton />)
    await user.click(screen.getByLabelText('Save this mix'))

    expect(screen.getByLabelText('Name your mix')).toHaveValue(
      'Morning Mist Custom',
    )
  })

  it('pre-populates name from sound names when no scene', async () => {
    mockIsLoggedIn = true
    mockActiveSounds = [
      { soundId: 'gentle-rain', volume: 0.7, label: 'Gentle Rain' },
      { soundId: 'fireplace', volume: 0.5, label: 'Fireplace' },
    ]
    const user = userEvent.setup()

    render(<SaveMixButton />)
    await user.click(screen.getByLabelText('Save this mix'))

    expect(screen.getByLabelText('Name your mix')).toHaveValue(
      'Gentle Rain + Fireplace',
    )
  })

  it('limits name to 50 characters', async () => {
    mockIsLoggedIn = true
    mockActiveSounds = [
      { soundId: 'gentle-rain', volume: 0.7, label: 'Gentle Rain' },
    ]
    const user = userEvent.setup()

    render(<SaveMixButton />)
    await user.click(screen.getByLabelText('Save this mix'))

    const input = screen.getByLabelText('Name your mix')
    expect(input).toHaveAttribute('maxLength', '50')
  })

  it('calls saveMix and shows toast on save', async () => {
    mockIsLoggedIn = true
    mockActiveSounds = [
      { soundId: 'gentle-rain', volume: 0.7, label: 'Gentle Rain' },
    ]
    const user = userEvent.setup()

    render(<SaveMixButton />)
    await user.click(screen.getByLabelText('Save this mix'))
    await user.clear(screen.getByLabelText('Name your mix'))
    await user.type(screen.getByLabelText('Name your mix'), 'My Custom Mix')
    await user.click(screen.getByText('Save'))

    expect(mockSaveMix).toHaveBeenCalledWith('My Custom Mix', [
      { soundId: 'gentle-rain', volume: 0.7 },
    ])
    expect(mockShowToast).toHaveBeenCalledWith('Mix saved!')
  })

  it('cancel hides the input', async () => {
    mockIsLoggedIn = true
    mockActiveSounds = [
      { soundId: 'gentle-rain', volume: 0.7, label: 'Gentle Rain' },
    ]
    const user = userEvent.setup()

    render(<SaveMixButton />)
    await user.click(screen.getByLabelText('Save this mix'))
    expect(screen.getByLabelText('Name your mix')).toBeInTheDocument()

    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByLabelText('Name your mix')).not.toBeInTheDocument()
  })
})
