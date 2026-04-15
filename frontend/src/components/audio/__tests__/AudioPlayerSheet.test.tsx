import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { AudioPlayerState } from '@/types/bible-audio'

const mockState: AudioPlayerState = {
  track: null,
  playbackState: 'idle',
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1.0,
  sheetState: 'closed',
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

let mockReducedMotion = false
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

import { AudioPlayerSheet } from '@/components/audio/AudioPlayerSheet'

const TRACK = {
  filesetId: 'EN1WEBN2DA',
  book: 'john',
  bookDisplayName: 'John',
  chapter: 3,
  translation: 'World English Bible',
  url: 'https://cdn.example.com/JHN/3.mp3',
}

describe('AudioPlayerSheet (BB-26)', () => {
  beforeEach(() => {
    mockState.track = null
    mockState.playbackState = 'idle'
    mockState.sheetState = 'closed'
    mockState.currentTime = 0
    mockState.duration = 0
    mockState.playbackSpeed = 1.0
    mockState.errorMessage = null
    mockReducedMotion = false
  })

  afterEach(() => cleanup())

  it('returns null when sheet is closed', () => {
    const { container } = render(<AudioPlayerSheet />)
    expect(container.firstChild).toBeNull()
  })

  it('renders expanded region when sheetState === "expanded"', async () => {
    mockState.track = TRACK
    mockState.sheetState = 'expanded'
    mockState.playbackState = 'paused'
    mockState.duration = 180
    render(<AudioPlayerSheet />)
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Audio player' })).toBeInTheDocument()
    })
  })

  it('renders minimized region when sheetState === "minimized"', async () => {
    mockState.track = TRACK
    mockState.sheetState = 'minimized'
    mockState.playbackState = 'paused'
    render(<AudioPlayerSheet />)
    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: 'Minimized audio player' }),
      ).toBeInTheDocument()
    })
  })

  it('sets transition to 0ms when prefers-reduced-motion', () => {
    mockState.track = TRACK
    mockState.sheetState = 'expanded'
    mockReducedMotion = true
    render(<AudioPlayerSheet />)
    const region = screen.getByRole('region')
    expect(region.getAttribute('style')).toContain('0ms')
  })

  it('applies lg:max-w-2xl at desktop', () => {
    mockState.track = TRACK
    mockState.sheetState = 'expanded'
    render(<AudioPlayerSheet />)
    const region = screen.getByRole('region')
    expect(region.className).toContain('lg:max-w-2xl')
  })

  it('sheet has z-40 layering', () => {
    mockState.track = TRACK
    mockState.sheetState = 'expanded'
    render(<AudioPlayerSheet />)
    const region = screen.getByRole('region')
    expect(region.className).toContain('z-40')
  })
})
