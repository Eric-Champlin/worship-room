import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MixerSoundRow } from '../MixerSoundRow'
import type { ActiveSound } from '@/types/audio'

const RAIN: ActiveSound = { soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }

describe('MixerSoundRow', () => {
  it('renders icon, name, slider, and remove button', () => {
    render(
      <MixerSoundRow
        sound={RAIN}
        iconName="CloudRain"
        onVolumeChange={() => {}}
        onRemove={() => {}}
      />,
    )

    expect(screen.getByText('Gentle Rain')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
    expect(screen.getByLabelText('Remove Gentle Rain')).toBeInTheDocument()
  })

  it('calls onVolumeChange with correct soundId and normalized volume', async () => {
    const handleVolume = vi.fn()
    render(
      <MixerSoundRow
        sound={RAIN}
        iconName="CloudRain"
        onVolumeChange={handleVolume}
        onRemove={() => {}}
      />,
    )

    const slider = screen.getByRole('slider')
    // fireEvent.change is more reliable for range inputs than userEvent
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(slider, { target: { value: '80' } })

    expect(handleVolume).toHaveBeenCalledWith('gentle-rain', 0.8)
  })

  it('calls onRemove with soundId when remove button clicked', async () => {
    const handleRemove = vi.fn()
    const user = userEvent.setup()

    render(
      <MixerSoundRow
        sound={RAIN}
        iconName="CloudRain"
        onVolumeChange={() => {}}
        onRemove={handleRemove}
      />,
    )

    await user.click(screen.getByLabelText('Remove Gentle Rain'))
    expect(handleRemove).toHaveBeenCalledWith('gentle-rain')
  })
})
