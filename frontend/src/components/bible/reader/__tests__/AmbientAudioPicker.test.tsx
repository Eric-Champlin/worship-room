import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AmbientAudioPicker } from '../AmbientAudioPicker'

// --- Mocks ---

const mockDispatch = vi.fn()
const mockToggleSound = vi.fn()
const mockSetReadingContext = vi.fn()
const mockClearReadingContext = vi.fn()

const DEFAULT_AUDIO_STATE = {
  activeSounds: [],
  foregroundContent: null,
  masterVolume: 0.35,
  foregroundBackgroundBalance: 0.8,
  isPlaying: false,
  sleepTimer: null,
  activeRoutine: null,
  pillVisible: false,
  drawerOpen: false,
  currentSceneName: null,
  currentSceneId: null,
  foregroundEndedCounter: 0,
  readingContext: null,
}

let mockAudioState = { ...DEFAULT_AUDIO_STATE }

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockAudioState,
  useAudioDispatch: () => mockDispatch,
  useReadingContext: () => ({
    setReadingContext: mockSetReadingContext,
    clearReadingContext: mockClearReadingContext,
  }),
}))

vi.mock('@/hooks/useSoundToggle', () => ({
  useSoundToggle: () => ({
    loadingSoundIds: new Set(),
    errorSoundIds: new Set(),
    toggleSound: mockToggleSound,
  }),
}))

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}))

vi.mock('@/services/storage-service', () => ({
  storageService: {
    getListeningHistory: () => [],
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: '1', name: 'Test' } }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

function createAnchorRef() {
  const button = document.createElement('button')
  button.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    bottom: 50,
    right: 100,
    width: 44,
    height: 44,
    x: 0,
    y: 0,
    toJSON: () => {},
  })
  document.body.appendChild(button)
  return { current: button }
}

function renderPicker(overrides?: Partial<React.ComponentProps<typeof AmbientAudioPicker>>) {
  const anchorRef = createAnchorRef()
  return render(
    <BrowserRouter>
      <AmbientAudioPicker
        isOpen
        onClose={vi.fn()}
        anchorRef={anchorRef}
        bookName="John"
        chapter={3}
        {...overrides}
      />
    </BrowserRouter>,
  )
}

describe('AmbientAudioPicker', () => {
  beforeEach(() => {
    mockAudioState = { ...DEFAULT_AUDIO_STATE }
    vi.clearAllMocks()
  })

  it('renders "Sounds" heading when open', () => {
    renderPicker()
    expect(screen.getByText('Sounds')).toBeInTheDocument()
  })

  it('renders 4 quick-row cards with curated defaults when no history', () => {
    renderPicker()
    expect(screen.getByLabelText(/Play Gentle Rain/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Play Ocean Waves/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Play Fireplace/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Play Soft Piano/)).toBeInTheDocument()
  })

  it('tapping a quick-row card calls toggleSound', () => {
    renderPicker()
    fireEvent.click(screen.getByLabelText(/Play Gentle Rain/))
    expect(mockToggleSound).toHaveBeenCalled()
  })

  it('shows active state on playing card', () => {
    mockAudioState = {
      ...DEFAULT_AUDIO_STATE,
      activeSounds: [{ soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }],
      isPlaying: true,
    }
    renderPicker()
    const btn = screen.getByLabelText(/Pause Gentle Rain/)
    expect(btn).toBeInTheDocument()
    expect(btn.getAttribute('aria-pressed')).toBe('true')
  })

  it('renders VolumeSlider with masterVolume', () => {
    mockAudioState = { ...DEFAULT_AUDIO_STATE, masterVolume: 0.5 }
    renderPicker()
    const slider = screen.getByRole('slider', { name: /master volume/i })
    expect(slider).toBeInTheDocument()
    expect((slider as HTMLInputElement).value).toBe('50')
  })

  it('adjusting volume dispatches SET_MASTER_VOLUME', () => {
    renderPicker()
    const slider = screen.getByRole('slider', { name: /master volume/i })
    fireEvent.change(slider, { target: { value: '60' } })
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_MASTER_VOLUME',
      payload: { volume: 0.6 },
    })
  })

  it('"Browse all sounds" dispatches OPEN_DRAWER', () => {
    const onClose = vi.fn()
    renderPicker({ onClose })
    fireEvent.click(screen.getByText('Browse all sounds'))
    expect(onClose).toHaveBeenCalled()
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' })
  })

  it('"Stop sound" dispatches STOP_ALL', () => {
    mockAudioState = {
      ...DEFAULT_AUDIO_STATE,
      activeSounds: [{ soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }],
      isPlaying: true,
    }
    renderPicker()
    fireEvent.click(screen.getByText('Stop sound'))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'STOP_ALL' })
  })

  it('"Stop sound" hidden when no audio playing', () => {
    renderPicker()
    expect(screen.queryByText('Stop sound')).not.toBeInTheDocument()
  })

  it('closes on X button click', () => {
    const onClose = vi.fn()
    renderPicker({ onClose })
    fireEvent.click(screen.getByLabelText('Close sound picker'))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on scrim click (mobile)', () => {
    // Force mobile layout: window width < 1024 (default in jsdom is 1024x768)
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const onClose = vi.fn()
    renderPicker({ onClose })
    const scrim = document.querySelector('.bg-black\\/30')
    if (scrim) fireEvent.click(scrim)
    expect(onClose).toHaveBeenCalled()

    // Reset
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
  })

  it('does not render when closed', () => {
    render(
      <BrowserRouter>
        <AmbientAudioPicker
          isOpen={false}
          onClose={vi.fn()}
          anchorRef={createAnchorRef()}
          bookName="John"
          chapter={3}
        />
      </BrowserRouter>,
    )
    expect(screen.queryByText('Sounds')).not.toBeInTheDocument()
  })

  it('tapping active sound dispatches PAUSE_ALL instead of toggleSound', () => {
    mockAudioState = {
      ...DEFAULT_AUDIO_STATE,
      activeSounds: [{ soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }],
      isPlaying: true,
    }
    renderPicker()
    fireEvent.click(screen.getByLabelText(/Pause Gentle Rain/))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'PAUSE_ALL' })
    expect(mockToggleSound).not.toHaveBeenCalled()
  })
})
