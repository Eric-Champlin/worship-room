import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AudioPlayerState } from '@/types/bible-audio'

// Mock useAudioPlayer so we can drive state directly
const mockState: AudioPlayerState = {
  track: null,
  playbackState: 'idle',
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1.0,
  sheetState: 'closed',
  errorMessage: null,
  continuousPlayback: true,
  endOfBible: false,
}

const mockActions = {
  play: vi.fn(),
  pause: vi.fn(),
  toggle: vi.fn(),
  seek: vi.fn(),
  setSpeed: vi.fn(),
  stop: vi.fn(),
  expand: vi.fn(),
  minimize: vi.fn(),
  close: vi.fn(),
  dismissError: vi.fn(),
  setContinuousPlayback: vi.fn(),
  startFromGenesis: vi.fn(),
}

vi.mock('@/hooks/audio/useAudioPlayer', () => ({
  useAudioPlayer: () => ({ state: mockState, actions: mockActions }),
}))

import { AudioPlayerMini } from '@/components/audio/AudioPlayerMini'

describe('AudioPlayerMini (BB-26)', () => {
  beforeEach(() => {
    mockState.track = {
      filesetId: 'EN1WEBN2DA',
      book: 'john',
      bookDisplayName: 'John',
      chapter: 3,
      translation: 'World English Bible',
      url: 'https://cdn.example.com/JHN/3.mp3',
    }
    mockState.playbackState = 'paused'
    Object.values(mockActions).forEach((fn) => fn.mockClear())
  })

  afterEach(() => cleanup())

  it('renders chapter reference', () => {
    render(<AudioPlayerMini />)
    expect(screen.getByText(/John 3/)).toBeInTheDocument()
  })

  it('renders play icon when paused', () => {
    mockState.playbackState = 'paused'
    render(<AudioPlayerMini />)
    expect(screen.getByRole('button', { name: 'Resume audio' })).toBeInTheDocument()
  })

  it('renders pause icon when playing', () => {
    mockState.playbackState = 'playing'
    render(<AudioPlayerMini />)
    expect(screen.getByRole('button', { name: 'Pause audio' })).toBeInTheDocument()
  })

  it('tapping the expand area calls actions.expand', async () => {
    const user = userEvent.setup()
    render(<AudioPlayerMini />)
    await user.click(screen.getByRole('button', { name: 'Expand audio player' }))
    expect(mockActions.expand).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when track is null', () => {
    mockState.track = null
    const { container } = render(<AudioPlayerMini />)
    expect(container.firstChild).toBeNull()
  })

  // BB-29 spec requirement 17 — toggle is never rendered on the minimized bar
  it('does NOT render continuous playback toggle (BB-29)', () => {
    render(<AudioPlayerMini />)
    expect(screen.queryByRole('switch')).toBeNull()
  })
})
