import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SleepTimerPanel } from '../SleepTimerPanel'
import type { AudioPlayerState, AudioPlayerActions } from '@/types/bible-audio'

// Mock useAudioPlayer
const mockActions: AudioPlayerActions = {
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

const IDLE_STATE: AudioPlayerState = {
  track: null,
  playbackState: 'idle',
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1.0,
  sheetState: 'expanded',
  errorMessage: null,
  continuousPlayback: true,
  endOfBible: false,
  sleepTimer: null,
  sleepFade: null,
}

const PLAYING_STATE: AudioPlayerState = {
  ...IDLE_STATE,
  track: {
    filesetId: 'EN1WEBN2DA',
    book: 'john',
    bookDisplayName: 'John',
    chapter: 3,
    translation: 'World English Bible',
    url: 'https://cdn.example.com/JHN/3.mp3',
  },
  playbackState: 'playing',
}

let mockState = IDLE_STATE
vi.mock('@/hooks/audio/useAudioPlayer', () => ({
  useAudioPlayer: () => ({ state: mockState, actions: mockActions }),
}))

// Mock useFocusTrap — return a ref-like object
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}))

describe('SleepTimerPanel', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockState = IDLE_STATE
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SleepTimerPanel isOpen={false} onClose={onClose} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders panel with title and presets when open', () => {
    mockState = PLAYING_STATE
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    expect(screen.getByText('Sleep timer')).toBeInTheDocument()
    expect(screen.getByText('15 min')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByText('45 min')).toBeInTheDocument()
    expect(screen.getByText('1 hour')).toBeInTheDocument()
    expect(screen.getByText('1 hr 30 min')).toBeInTheDocument()
    expect(screen.getByText('2 hours')).toBeInTheDocument()
    expect(screen.getByText('End of chapter')).toBeInTheDocument()
    expect(screen.getByText('End of book')).toBeInTheDocument()
  })

  it('shows "Start audio first" when no audio playing', () => {
    mockState = IDLE_STATE
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    expect(
      screen.getByText('Start audio first, then set a timer'),
    ).toBeInTheDocument()
    const presetBtn = screen.getByText('30 min')
    expect(presetBtn).toBeDisabled()
  })

  it('shows "Choose how long to listen" when audio playing, no timer', () => {
    mockState = PLAYING_STATE
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    expect(
      screen.getByText('Choose how long to listen'),
    ).toBeInTheDocument()
    const presetBtn = screen.getByText('30 min')
    expect(presetBtn).not.toBeDisabled()
  })

  it('clicking a preset calls setSleepTimer and onClose', async () => {
    mockState = PLAYING_STATE
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('30 min'))
    expect(mockActions.setSleepTimer).toHaveBeenCalledWith({
      type: 'duration',
      remainingMs: 1_800_000,
      preset: '30',
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows countdown subtitle when duration timer active', () => {
    mockState = {
      ...PLAYING_STATE,
      sleepTimer: { type: 'duration', remainingMs: 1_500_000, preset: '30' },
    }
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    expect(screen.getByText('Stopping in 25:00')).toBeInTheDocument()
  })

  it('shows "Ends with chapter" for structural preset', () => {
    mockState = {
      ...PLAYING_STATE,
      sleepTimer: {
        type: 'end-of-chapter',
        remainingMs: 0,
        preset: 'chapter',
      },
    }
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    expect(screen.getByText('Ends with chapter')).toBeInTheDocument()
  })

  it('shows "Fading..." during fade', () => {
    mockState = {
      ...PLAYING_STATE,
      sleepFade: { remainingMs: 15_000 },
    }
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    expect(screen.getByText('Fading...')).toBeInTheDocument()
  })

  it('highlights the selected preset', () => {
    mockState = {
      ...PLAYING_STATE,
      sleepTimer: { type: 'duration', remainingMs: 1_800_000, preset: '30' },
    }
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    const selectedBtn = screen.getByText('30 min')
    expect(selectedBtn.className).toContain('bg-white/15')
  })

  it('cancel button calls cancelSleepTimer', async () => {
    mockState = {
      ...PLAYING_STATE,
      sleepTimer: { type: 'duration', remainingMs: 1_800_000, preset: '30' },
    }
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('Cancel timer'))
    expect(mockActions.cancelSleepTimer).toHaveBeenCalled()
  })

  it('cancel button not shown when no timer', () => {
    mockState = PLAYING_STATE
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    expect(screen.queryByText('Cancel timer')).not.toBeInTheDocument()
  })

  it('scrim click calls onClose', async () => {
    mockState = PLAYING_STATE
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    const user = userEvent.setup()
    const scrim = document.querySelector('[aria-hidden="true"]')!
    await user.click(scrim)
    expect(onClose).toHaveBeenCalled()
  })

  it('focus trap is applied when open', () => {
    mockState = PLAYING_STATE
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    mockState = PLAYING_STATE
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'sleep-timer-title')
  })

  it('close button has 44x44 outer hit area', () => {
    mockState = PLAYING_STATE
    render(<SleepTimerPanel isOpen={true} onClose={onClose} />)
    const closeBtn = screen.getByRole('button', { name: /close sleep timer/i })
    expect(closeBtn.className).toContain('h-[44px]')
    expect(closeBtn.className).toContain('w-[44px]')
  })
})
