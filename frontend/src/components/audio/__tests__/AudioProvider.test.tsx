import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioProvider, useAudioState, useAudioDispatch } from '../AudioProvider'

// Mock AudioEngineService so we don't need real Web Audio API
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

function StateDisplay() {
  const state = useAudioState()
  return (
    <div>
      <span data-testid="is-playing">{String(state.isPlaying)}</span>
      <span data-testid="master-volume">{state.masterVolume}</span>
      <span data-testid="pill-visible">{String(state.pillVisible)}</span>
      <span data-testid="drawer-open">{String(state.drawerOpen)}</span>
    </div>
  )
}

function DispatchButton({ actionType }: { actionType: string }) {
  const dispatch = useAudioDispatch()
  return (
    <button
      data-testid={`dispatch-${actionType}`}
      onClick={() => {
        if (actionType === 'ADD_SOUND') {
          dispatch({
            type: 'ADD_SOUND',
            payload: { soundId: 'rain', volume: 0.6, label: 'Rain', url: '/audio/rain.mp3' },
          })
        } else {
          dispatch({ type: actionType } as never)
        }
      }}
    >
      {actionType}
    </button>
  )
}

function TestApp({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AudioProvider>{children}</AudioProvider>
    </MemoryRouter>
  )
}

describe('AudioProvider', () => {
  beforeEach(() => {
    // Mock mediaSession
    Object.defineProperty(navigator, 'mediaSession', {
      value: {
        metadata: null,
        setActionHandler: vi.fn(),
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('provides initial audio state', () => {
    render(
      <TestApp>
        <StateDisplay />
      </TestApp>,
    )

    expect(screen.getByTestId('is-playing').textContent).toBe('false')
    expect(screen.getByTestId('master-volume').textContent).toBe('0.8')
    expect(screen.getByTestId('pill-visible').textContent).toBe('false')
  })

  it('dispatches ADD_SOUND and updates state', async () => {
    const user = userEvent.setup()
    render(
      <TestApp>
        <StateDisplay />
        <DispatchButton actionType="ADD_SOUND" />
      </TestApp>,
    )

    await user.click(screen.getByTestId('dispatch-ADD_SOUND'))
    expect(screen.getByTestId('is-playing').textContent).toBe('true')
    expect(screen.getByTestId('pill-visible').textContent).toBe('true')
  })

  it('renders aria-live region', () => {
    render(
      <TestApp>
        <StateDisplay />
      </TestApp>,
    )

    expect(screen.getByTestId('audio-aria-live')).toBeInTheDocument()
    expect(screen.getByTestId('audio-aria-live')).toHaveAttribute(
      'aria-live',
      'polite',
    )
  })

  describe('keyboard shortcuts', () => {
    it('spacebar toggles play/pause when no input focused', async () => {
      render(
        <TestApp>
          <StateDisplay />
          <DispatchButton actionType="ADD_SOUND" />
        </TestApp>,
      )

      const user = userEvent.setup()
      // First add a sound so there's something to pause
      await user.click(screen.getByTestId('dispatch-ADD_SOUND'))
      expect(screen.getByTestId('is-playing').textContent).toBe('true')

      // Press spacebar — should pause
      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'Space', bubbles: true }),
        )
      })
      expect(screen.getByTestId('is-playing').textContent).toBe('false')
    })

    it('spacebar does not fire when textarea is focused', async () => {
      render(
        <TestApp>
          <StateDisplay />
          <DispatchButton actionType="ADD_SOUND" />
          <textarea data-testid="text-input" />
        </TestApp>,
      )

      const user = userEvent.setup()
      await user.click(screen.getByTestId('dispatch-ADD_SOUND'))

      // Focus the textarea
      screen.getByTestId('text-input').focus()

      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'Space', bubbles: true }),
        )
      })

      // Should still be playing because the shortcut was blocked
      expect(screen.getByTestId('is-playing').textContent).toBe('true')
    })

    it('arrow up increases volume by 5%', async () => {
      render(
        <TestApp>
          <StateDisplay />
        </TestApp>,
      )

      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }),
        )
      })

      // Default 0.8 + 0.05 = 0.85
      expect(screen.getByTestId('master-volume').textContent).toBe('0.85')
    })

    it('arrow down decreases volume by 5%', async () => {
      render(
        <TestApp>
          <StateDisplay />
        </TestApp>,
      )

      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }),
        )
      })

      // Default 0.8 - 0.05 = 0.75
      expect(screen.getByTestId('master-volume').textContent).toBe('0.75')
    })
  })
})
