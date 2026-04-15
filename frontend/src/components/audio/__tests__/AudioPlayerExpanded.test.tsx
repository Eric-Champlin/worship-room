import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AudioPlayerState } from '@/types/bible-audio'

const mockState: AudioPlayerState = {
  track: {
    filesetId: 'EN1WEBN2DA',
    book: 'john',
    bookDisplayName: 'John',
    chapter: 3,
    translation: 'World English Bible',
    url: 'https://cdn.example.com/JHN/3.mp3',
  },
  playbackState: 'paused',
  currentTime: 30,
  duration: 180,
  playbackSpeed: 1.0,
  sheetState: 'expanded',
  errorMessage: null,
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
}

vi.mock('@/hooks/audio/useAudioPlayer', () => ({
  useAudioPlayer: () => ({ state: mockState, actions: mockActions }),
}))

import { AudioPlayerExpanded } from '@/components/audio/AudioPlayerExpanded'

function resetMockState() {
  mockState.track = {
    filesetId: 'EN1WEBN2DA',
    book: 'john',
    bookDisplayName: 'John',
    chapter: 3,
    translation: 'World English Bible',
    url: 'https://cdn.example.com/JHN/3.mp3',
  }
  mockState.playbackState = 'paused'
  mockState.currentTime = 30
  mockState.duration = 180
  mockState.playbackSpeed = 1.0
  mockState.sheetState = 'expanded'
  mockState.errorMessage = null
}

describe('AudioPlayerExpanded (BB-26)', () => {
  beforeEach(() => {
    resetMockState()
    Object.values(mockActions).forEach((fn) => fn.mockClear())
  })

  afterEach(() => cleanup())

  it('renders chapter reference and translation', () => {
    render(<AudioPlayerExpanded />)
    expect(screen.getByText('John 3')).toBeInTheDocument()
    expect(screen.getByText('World English Bible')).toBeInTheDocument()
  })

  it('renders scrubber with correct current/duration values', () => {
    render(<AudioPlayerExpanded />)
    const slider = screen.getByRole('slider', { name: 'Seek audio position' }) as HTMLInputElement
    expect(slider.value).toBe('30')
    expect(slider.max).toBe('180')
  })

  it('scrubber change triggers actions.seek', () => {
    render(<AudioPlayerExpanded />)
    const slider = screen.getByRole('slider', { name: 'Seek audio position' })
    fireEvent.change(slider, { target: { value: '90' } })
    expect(mockActions.seek).toHaveBeenCalledWith(90)
  })

  it('speed picker highlights current speed via aria-pressed', () => {
    mockState.playbackSpeed = 1.25
    render(<AudioPlayerExpanded />)
    const btn = screen.getByRole('button', { name: '1.25×' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('speed picker click triggers actions.setSpeed', async () => {
    const user = userEvent.setup()
    render(<AudioPlayerExpanded />)
    await user.click(screen.getByRole('button', { name: '1.5×' }))
    expect(mockActions.setSpeed).toHaveBeenCalledWith(1.5)
  })

  it('focus moves to play button on mount', () => {
    render(<AudioPlayerExpanded />)
    const playBtn = screen.getByRole('button', { name: 'Play audio' })
    expect(document.activeElement).toBe(playBtn)
  })

  it('close button calls actions.close', async () => {
    const user = userEvent.setup()
    render(<AudioPlayerExpanded />)
    await user.click(screen.getByRole('button', { name: 'Close audio player' }))
    expect(mockActions.close).toHaveBeenCalledTimes(1)
  })

  it('minimize button calls actions.minimize', async () => {
    const user = userEvent.setup()
    render(<AudioPlayerExpanded />)
    await user.click(screen.getByRole('button', { name: 'Minimize audio player' }))
    expect(mockActions.minimize).toHaveBeenCalledTimes(1)
  })

  it('error state shows message and dismiss button', () => {
    mockState.playbackState = 'error'
    mockState.errorMessage = "This chapter's audio isn't available right now."
    render(<AudioPlayerExpanded />)
    expect(
      screen.getByText("This chapter's audio isn't available right now."),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
    // Scrubber should NOT be present in error state
    expect(screen.queryByRole('slider')).toBeNull()
  })

  it('FCBH attribution link rendered with correct href/target/rel', () => {
    render(<AudioPlayerExpanded />)
    const link = screen.getByRole('link', { name: /Faith Comes By Hearing/i })
    expect(link).toHaveAttribute('href', 'https://www.faithcomesbyhearing.com/bible-brain/legal')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('attribution link rendered even in error state (license compliance)', () => {
    mockState.playbackState = 'error'
    mockState.errorMessage = 'boom'
    render(<AudioPlayerExpanded />)
    expect(
      screen.getByRole('link', { name: /Faith Comes By Hearing/i }),
    ).toBeInTheDocument()
  })
})
