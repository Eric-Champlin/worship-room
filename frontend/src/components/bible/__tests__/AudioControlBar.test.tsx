import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AudioControlBar } from '../AudioControlBar'

const defaultProps = {
  playbackState: 'idle' as const,
  currentVerseIndex: -1,
  totalVerses: 28,
  speed: 1,
  onSpeedChange: vi.fn(),
  voiceGender: 'female' as const,
  onVoiceGenderChange: vi.fn(),
  availableVoiceCount: 2,
  onPlay: vi.fn(),
  onPause: vi.fn(),
  onStop: vi.fn(),
}

describe('AudioControlBar', () => {
  it('renders all controls', () => {
    render(<AudioControlBar {...defaultProps} />)

    expect(screen.getByLabelText('Play chapter')).toBeInTheDocument()
    expect(screen.getByLabelText('Stop reading')).toBeInTheDocument()
    expect(screen.getByLabelText('Reading speed 0.75x')).toBeInTheDocument()
    expect(screen.getByLabelText('Reading speed 1x')).toBeInTheDocument()
    expect(screen.getByLabelText('Reading speed 1.25x')).toBeInTheDocument()
    expect(screen.getByLabelText('Reading speed 1.5x')).toBeInTheDocument()
    expect(screen.getByText('Verse 1 of 28')).toBeInTheDocument()
    expect(screen.getByLabelText('Male voice')).toBeInTheDocument()
    expect(screen.getByLabelText('Female voice')).toBeInTheDocument()
  })

  it('play button shows Play icon when idle', () => {
    render(<AudioControlBar {...defaultProps} playbackState="idle" />)
    expect(screen.getByLabelText('Play chapter')).toBeInTheDocument()
  })

  it('play button shows Pause icon when playing', () => {
    render(<AudioControlBar {...defaultProps} playbackState="playing" />)
    expect(screen.getByLabelText('Pause reading')).toBeInTheDocument()
  })

  it('play button shows Resume label when paused', () => {
    render(<AudioControlBar {...defaultProps} playbackState="paused" />)
    expect(screen.getByLabelText('Resume reading')).toBeInTheDocument()
  })

  it('speed pill selected state has correct classes', () => {
    render(<AudioControlBar {...defaultProps} speed={1.25} />)

    const selected = screen.getByLabelText('Reading speed 1.25x')
    expect(selected).toHaveAttribute('aria-checked', 'true')
    expect(selected.className).toContain('bg-primary/20')
    expect(selected.className).toContain('text-primary')

    const unselected = screen.getByLabelText('Reading speed 1x')
    expect(unselected).toHaveAttribute('aria-checked', 'false')
    expect(unselected.className).toContain('text-white/50')
  })

  it('voice toggle hidden when availableVoiceCount <= 1', () => {
    render(<AudioControlBar {...defaultProps} availableVoiceCount={1} />)
    expect(screen.queryByLabelText('Male voice')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Female voice')).not.toBeInTheDocument()
  })

  it('progress text shows "Verse X of Y"', () => {
    render(<AudioControlBar {...defaultProps} currentVerseIndex={2} totalVerses={28} />)
    expect(screen.getByText('Verse 3 of 28')).toBeInTheDocument()
  })

  it('progress region has aria-live="polite"', () => {
    render(<AudioControlBar {...defaultProps} />)
    const progress = screen.getByText('Verse 1 of 28')
    expect(progress).toHaveAttribute('aria-live', 'polite')
  })

  it('all buttons have aria-labels', () => {
    render(<AudioControlBar {...defaultProps} />)
    expect(screen.getByLabelText('Play chapter')).toBeInTheDocument()
    expect(screen.getByLabelText('Stop reading')).toBeInTheDocument()
    expect(screen.getByLabelText('Male voice')).toBeInTheDocument()
    expect(screen.getByLabelText('Female voice')).toBeInTheDocument()
  })

  it('all interactive elements meet 44px touch targets', () => {
    render(<AudioControlBar {...defaultProps} />)

    const playBtn = screen.getByLabelText('Play chapter')
    expect(playBtn.className).toContain('min-h-[44px]')
    expect(playBtn.className).toContain('min-w-[44px]')

    const stopBtn = screen.getByLabelText('Stop reading')
    expect(stopBtn.className).toContain('min-h-[44px]')
    expect(stopBtn.className).toContain('min-w-[44px]')

    const maleBtn = screen.getByLabelText('Male voice')
    expect(maleBtn.className).toContain('min-h-[44px]')
    expect(maleBtn.className).toContain('min-w-[44px]')
  })

  it('speed pills have role="radiogroup"', () => {
    render(<AudioControlBar {...defaultProps} />)
    expect(screen.getByRole('radiogroup', { name: 'Reading speed' })).toBeInTheDocument()
  })

  it('stop button disabled when idle', () => {
    render(<AudioControlBar {...defaultProps} playbackState="idle" />)
    const stopBtn = screen.getByLabelText('Stop reading')
    expect(stopBtn).toBeDisabled()
  })

  it('stop button enabled when playing', () => {
    render(<AudioControlBar {...defaultProps} playbackState="playing" />)
    const stopBtn = screen.getByLabelText('Stop reading')
    expect(stopBtn).not.toBeDisabled()
  })

  it('calls onPlay when play button clicked', async () => {
    const user = userEvent.setup()
    const onPlay = vi.fn()
    render(<AudioControlBar {...defaultProps} onPlay={onPlay} />)

    await user.click(screen.getByLabelText('Play chapter'))
    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('calls onPause when pause button clicked while playing', async () => {
    const user = userEvent.setup()
    const onPause = vi.fn()
    render(<AudioControlBar {...defaultProps} playbackState="playing" onPause={onPause} />)

    await user.click(screen.getByLabelText('Pause reading'))
    expect(onPause).toHaveBeenCalledTimes(1)
  })

  it('calls onSpeedChange when speed pill clicked', async () => {
    const user = userEvent.setup()
    const onSpeedChange = vi.fn()
    render(<AudioControlBar {...defaultProps} onSpeedChange={onSpeedChange} />)

    await user.click(screen.getByLabelText('Reading speed 1.5x'))
    expect(onSpeedChange).toHaveBeenCalledWith(1.5)
  })

  it('calls onVoiceGenderChange when voice toggle clicked', async () => {
    const user = userEvent.setup()
    const onVoiceGenderChange = vi.fn()
    render(<AudioControlBar {...defaultProps} onVoiceGenderChange={onVoiceGenderChange} />)

    await user.click(screen.getByLabelText('Male voice'))
    expect(onVoiceGenderChange).toHaveBeenCalledWith('male')
  })

  it('female voice button has aria-pressed="true" when selected', () => {
    render(<AudioControlBar {...defaultProps} voiceGender="female" />)
    expect(screen.getByLabelText('Female voice')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Male voice')).toHaveAttribute('aria-pressed', 'false')
  })
})
