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
  continuousPlayback: true,
  endOfBible: false,
  sleepTimer: null,
  sleepFade: null,
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
  setSleepTimer: vi.fn(),
  cancelSleepTimer: vi.fn(),
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
  mockState.continuousPlayback = true
  mockState.endOfBible = false
  mockState.sleepTimer = null
  mockState.sleepFade = null
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

describe('AudioPlayerExpanded (BB-29) — continuous playback toggle', () => {
  beforeEach(() => {
    resetMockState()
    Object.values(mockActions).forEach((fn) => fn.mockClear())
  })

  afterEach(() => cleanup())

  it('renders toggle with correct label and description', () => {
    render(<AudioPlayerExpanded />)
    expect(
      screen.getByRole('switch', { name: /continuous playback/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Auto-play next chapter')).toBeInTheDocument()
  })

  it('toggle reflects continuousPlayback true state', () => {
    mockState.continuousPlayback = true
    render(<AudioPlayerExpanded />)
    const toggle = screen.getByRole('switch', { name: /continuous playback/i })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('toggle reflects continuousPlayback false state', () => {
    mockState.continuousPlayback = false
    render(<AudioPlayerExpanded />)
    const toggle = screen.getByRole('switch', { name: /continuous playback/i })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking toggle calls setContinuousPlayback with inverted value', async () => {
    const user = userEvent.setup()
    mockState.continuousPlayback = true
    render(<AudioPlayerExpanded />)
    const toggle = screen.getByRole('switch', { name: /continuous playback/i })
    await user.click(toggle)
    expect(mockActions.setContinuousPlayback).toHaveBeenCalledWith(false)
  })

  it('pressing Enter on toggle fires setContinuousPlayback', async () => {
    const user = userEvent.setup()
    mockState.continuousPlayback = true
    render(<AudioPlayerExpanded />)
    const toggle = screen.getByRole('switch', { name: /continuous playback/i })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(mockActions.setContinuousPlayback).toHaveBeenCalledWith(false)
  })

  it('pressing Space on toggle fires setContinuousPlayback (native button)', async () => {
    const user = userEvent.setup()
    mockState.continuousPlayback = true
    render(<AudioPlayerExpanded />)
    const toggle = screen.getByRole('switch', { name: /continuous playback/i })
    toggle.focus()
    await user.keyboard(' ')
    expect(mockActions.setContinuousPlayback).toHaveBeenCalledWith(false)
  })

  it('toggle is hidden during error state', () => {
    mockState.playbackState = 'error'
    mockState.errorMessage = 'boom'
    render(<AudioPlayerExpanded />)
    expect(screen.queryByRole('switch', { name: /continuous playback/i })).toBeNull()
  })

  it('toggle has stable id bb29-continuous-playback', () => {
    render(<AudioPlayerExpanded />)
    const labelSpan = document.getElementById('bb29-continuous-playback-label')
    expect(labelSpan).not.toBeNull()
    expect(labelSpan?.textContent).toBe('Continuous playback')
  })

  it('toggle is positioned between speed picker and attribution footer', () => {
    render(<AudioPlayerExpanded />)
    const speedPicker = screen.getByRole('group', { name: 'Playback speed' })
    const toggle = screen.getByRole('switch', { name: /continuous playback/i })
    const attribution = screen.getByRole('link', { name: /Faith Comes By Hearing/i })

    // speedPicker should come before toggle in DOM order, toggle before attribution
    const order =
      speedPicker.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING
    expect(order).toBeTruthy()
    const order2 =
      toggle.compareDocumentPosition(attribution) & Node.DOCUMENT_POSITION_FOLLOWING
    expect(order2).toBeTruthy()
  })
})

describe('AudioPlayerExpanded (BB-29) — end-of-Bible state', () => {
  beforeEach(() => {
    resetMockState()
    Object.values(mockActions).forEach((fn) => fn.mockClear())
    // Enter end-of-Bible state with Revelation 22 as the track
    mockState.track = {
      filesetId: 'EN1WEBN2DA',
      book: 'revelation',
      bookDisplayName: 'Revelation',
      chapter: 22,
      translation: 'World English Bible',
      url: 'https://cdn.example.com/REV/22.mp3',
    }
    mockState.playbackState = 'idle'
    mockState.currentTime = 0
    mockState.endOfBible = true
  })

  afterEach(() => cleanup())

  it('renders gentle end-of-Bible message', () => {
    render(<AudioPlayerExpanded />)
    expect(screen.getByText(/end of the bible/i)).toBeInTheDocument()
  })

  it('renders Start from Genesis button with correct aria-label', () => {
    render(<AudioPlayerExpanded />)
    expect(
      screen.getByRole('button', { name: 'Start playback from Genesis 1' }),
    ).toBeInTheDocument()
  })

  it('preserves chapter reference at top', () => {
    render(<AudioPlayerExpanded />)
    expect(screen.getByText('Revelation 22')).toBeInTheDocument()
  })

  it('preserves translation label', () => {
    render(<AudioPlayerExpanded />)
    expect(screen.getByText('World English Bible')).toBeInTheDocument()
  })

  it('preserves attribution footer', () => {
    render(<AudioPlayerExpanded />)
    expect(
      screen.getByRole('link', { name: /Faith Comes By Hearing/i }),
    ).toBeInTheDocument()
  })

  it('hides scrubber in end-of-Bible state', () => {
    render(<AudioPlayerExpanded />)
    expect(screen.queryByRole('slider')).toBeNull()
  })

  it('hides speed picker in end-of-Bible state', () => {
    render(<AudioPlayerExpanded />)
    expect(screen.queryByRole('group', { name: 'Playback speed' })).toBeNull()
  })

  it('hides continuous playback toggle in end-of-Bible state', () => {
    render(<AudioPlayerExpanded />)
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('clicking Start from Genesis calls actions.startFromGenesis', async () => {
    const user = userEvent.setup()
    render(<AudioPlayerExpanded />)
    await user.click(
      screen.getByRole('button', { name: 'Start playback from Genesis 1' }),
    )
    expect(mockActions.startFromGenesis).toHaveBeenCalledTimes(1)
  })

  it('focus moves to Start from Genesis button on mount', () => {
    render(<AudioPlayerExpanded />)
    const btn = screen.getByRole('button', {
      name: 'Start playback from Genesis 1',
    })
    expect(document.activeElement).toBe(btn)
  })
})

describe('AudioPlayerExpanded (BB-28) — sleep timer', () => {
  beforeEach(() => {
    resetMockState()
    Object.values(mockActions).forEach((fn) => fn.mockClear())
  })

  afterEach(() => cleanup())

  it('renders moon button in corner row', () => {
    render(<AudioPlayerExpanded />)
    expect(screen.getByRole('button', { name: 'Set sleep timer' })).toBeInTheDocument()
  })

  it('moon button shows active state when timer set', () => {
    mockState.sleepTimer = { type: 'duration', remainingMs: 900_000, preset: '15' }
    render(<AudioPlayerExpanded />)
    expect(
      screen.getByRole('button', { name: /sleep timer active/i }),
    ).toBeInTheDocument()
  })

  it('clicking moon button opens SleepTimerPanel', async () => {
    const user = userEvent.setup()
    render(<AudioPlayerExpanded />)
    await user.click(screen.getByRole('button', { name: 'Set sleep timer' }))
    expect(screen.getByRole('dialog', { name: /sleep timer/i })).toBeInTheDocument()
  })

  it('sleep timer indicator shows countdown when duration timer active', () => {
    mockState.sleepTimer = { type: 'duration', remainingMs: 90_000, preset: '15' }
    render(<AudioPlayerExpanded />)
    expect(screen.getByText('1:30')).toBeInTheDocument()
  })

  it('sleep timer indicator shows "Ends with chapter"', () => {
    mockState.sleepTimer = { type: 'end-of-chapter', remainingMs: 0, preset: 'chapter' }
    render(<AudioPlayerExpanded />)
    expect(screen.getByText('Ends with chapter')).toBeInTheDocument()
  })

  it('sleep timer indicator shows "Fading..."', () => {
    mockState.sleepFade = { remainingMs: 15_000 }
    render(<AudioPlayerExpanded />)
    expect(screen.getByText('Fading...')).toBeInTheDocument()
  })

  it('clicking indicator opens panel', async () => {
    const user = userEvent.setup()
    mockState.sleepTimer = { type: 'duration', remainingMs: 90_000, preset: '15' }
    render(<AudioPlayerExpanded />)
    await user.click(screen.getByText('1:30'))
    expect(screen.getByRole('dialog', { name: /sleep timer/i })).toBeInTheDocument()
  })

  it('indicator has aria-live="polite"', () => {
    mockState.sleepTimer = { type: 'duration', remainingMs: 90_000, preset: '15' }
    render(<AudioPlayerExpanded />)
    const indicator = screen.getByRole('button', { name: /sleep timer:.*remaining/i })
    expect(indicator).toHaveAttribute('aria-live', 'polite')
  })

  it('no indicator when no timer active', () => {
    render(<AudioPlayerExpanded />)
    expect(screen.queryByText('Fading...')).toBeNull()
    expect(screen.queryByText('Ends with chapter')).toBeNull()
    expect(screen.queryByText('Ends with book')).toBeNull()
  })
})
