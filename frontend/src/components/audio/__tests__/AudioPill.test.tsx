import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioProvider, useAudioDispatch } from '../AudioProvider'

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/lib/audio-engine', () => {
  class MockAudioEngineService {
    ensureContext = vi.fn()
    addSound = vi.fn().mockResolvedValue(undefined)
    removeSound = vi.fn()
    setSoundVolume = vi.fn()
    setMasterVolume = vi.fn()
    playForeground = vi.fn()
    seekForeground = vi.fn()
    setForegroundBalance = vi.fn()
    pauseAll = vi.fn()
    resumeAll = vi.fn()
    stopAll = vi.fn()
    getSoundCount = vi.fn(() => 0)
    getForegroundElement = vi.fn(() => null)
  }
  return { AudioEngineService: MockAudioEngineService }
})

// Helper to trigger audio state changes from inside the provider
function AddSoundButton() {
  const dispatch = useAudioDispatch()
  return (
    <button
      data-testid="add-sound"
      onClick={() =>
        dispatch({
          type: 'ADD_SOUND',
          payload: { soundId: 'rain', volume: 0.6, label: 'Rain', url: '/audio/rain.mp3' },
        })
      }
    >
      Add
    </button>
  )
}

function PauseButton() {
  const dispatch = useAudioDispatch()
  return (
    <button
      data-testid="pause"
      onClick={() => dispatch({ type: 'PAUSE_ALL' })}
    >
      Pause
    </button>
  )
}

function SetSceneButton() {
  const dispatch = useAudioDispatch()
  return (
    <button
      data-testid="set-scene"
      onClick={() => {
        dispatch({
          type: 'ADD_SOUND',
          payload: { soundId: 'ocean', volume: 0.5, label: 'Ocean', url: '/audio/ocean.mp3' },
        })
      }}
    >
      Set Scene
    </button>
  )
}

function renderPill() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AudioProvider>
        <AddSoundButton />
        <PauseButton />
        <SetSceneButton />
      </AudioProvider>
    </MemoryRouter>,
  )
}

describe('AudioPill', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaSession', {
      value: { metadata: null, setActionHandler: vi.fn() },
      writable: true,
      configurable: true,
    })
  })

  it('does not render when pillVisible is false', () => {
    renderPill()
    expect(
      screen.queryByRole('complementary', { name: /audio player controls/i }),
    ).not.toBeInTheDocument()
  })

  it('renders with correct role and aria-label when audio is playing', async () => {
    const user = userEvent.setup()
    renderPill()

    await user.click(screen.getByTestId('add-sound'))

    expect(
      screen.getByRole('complementary', { name: /audio player controls/i }),
    ).toBeInTheDocument()
  })

  it('play/pause button has "Pause all audio" label when playing', async () => {
    const user = userEvent.setup()
    renderPill()

    await user.click(screen.getByTestId('add-sound'))

    expect(
      screen.getByRole('button', { name: /pause all audio/i }),
    ).toBeInTheDocument()
  })

  it('play/pause button has "Resume all audio" label when paused', async () => {
    const user = userEvent.setup()
    renderPill()

    await user.click(screen.getByTestId('add-sound'))
    await user.click(screen.getByTestId('pause'))

    expect(
      screen.getByRole('button', { name: /resume all audio/i }),
    ).toBeInTheDocument()
  })

  it('clicking play/pause toggles playback', async () => {
    const user = userEvent.setup()
    renderPill()

    await user.click(screen.getByTestId('add-sound'))

    // Should show pause button (playing)
    const pauseBtn = screen.getByRole('button', { name: /pause all audio/i })
    await user.click(pauseBtn)

    // Should now show resume button (paused)
    expect(
      screen.getByRole('button', { name: /resume all audio/i }),
    ).toBeInTheDocument()
  })

  it('renders 3 waveform bars', async () => {
    const user = userEvent.setup()
    renderPill()

    await user.click(screen.getByTestId('add-sound'))

    const pill = screen.getByRole('complementary')
    // 3 bars are divs inside the waveform container (aria-hidden)
    const barContainer = pill.querySelector('[aria-hidden="true"]')
    expect(barContainer).toBeInTheDocument()
    expect(barContainer?.children).toHaveLength(3)
  })
})
