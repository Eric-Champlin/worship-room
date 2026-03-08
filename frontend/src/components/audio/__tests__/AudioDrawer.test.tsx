import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioProvider, useAudioDispatch } from '../AudioProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

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
    isBufferCached = vi.fn(() => false)
  }
  return { AudioEngineService: MockAudioEngineService }
})

function OpenDrawerButton() {
  const dispatch = useAudioDispatch()
  return (
    <button
      data-testid="open-drawer"
      onClick={() => {
        dispatch({
          type: 'ADD_SOUND',
          payload: { soundId: 'rain', volume: 0.6, label: 'Rain', url: '/audio/rain.mp3' },
        })
        dispatch({ type: 'OPEN_DRAWER' })
      }}
    >
      Open
    </button>
  )
}

function renderDrawer() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <AudioProvider>
            <OpenDrawerButton />
          </AudioProvider>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('AudioDrawer', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaSession', {
      value: { metadata: null, setActionHandler: vi.fn() },
      writable: true,
      configurable: true,
    })
  })

  it('does not render when drawerOpen is false', () => {
    renderDrawer()
    expect(
      screen.queryByRole('dialog', { name: /audio controls/i }),
    ).not.toBeInTheDocument()
  })

  it('renders with role="dialog" when open', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByTestId('open-drawer'))

    expect(
      screen.getByRole('dialog', { name: /audio controls/i }),
    ).toBeInTheDocument()
  })

  it('close button dispatches CLOSE_DRAWER', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByTestId('open-drawer'))

    const closeBtn = screen.getByRole('button', {
      name: /close audio controls/i,
    })
    await user.click(closeBtn)

    expect(
      screen.queryByRole('dialog', { name: /audio controls/i }),
    ).not.toBeInTheDocument()
  })

  it('renders master volume slider', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByTestId('open-drawer'))

    expect(
      screen.getByRole('slider', { name: /master volume/i }),
    ).toBeInTheDocument()
  })

  it('master volume slider shows percentage', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByTestId('open-drawer'))

    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('renders three tabs: Mixer, Timer, Saved', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByTestId('open-drawer'))

    expect(screen.getByRole('tab', { name: 'Mixer' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Timer' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Saved' })).toBeInTheDocument()
  })

  it('tab switching shows correct content', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByTestId('open-drawer'))

    // Default tab is Mixer — shows MixerTabContent with the active sound "Rain"
    expect(screen.getByText('Rain')).toBeInTheDocument()

    // Switch to Timer
    await user.click(screen.getByRole('tab', { name: 'Timer' }))
    expect(screen.getByText('Set a sleep timer')).toBeInTheDocument()

    // Switch to Saved
    await user.click(screen.getByRole('tab', { name: 'Saved' }))
    expect(
      screen.getByText('Your saved mixes and routines'),
    ).toBeInTheDocument()
  })

  it('renders play/pause button in drawer', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByTestId('open-drawer'))

    const dialog = screen.getByRole('dialog', { name: /audio controls/i })
    expect(
      within(dialog).getByRole('button', { name: /pause all audio/i }),
    ).toBeInTheDocument()
  })
})
