import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SoundGrid } from '../SoundGrid'

const EMPTY_SET = new Set<string>()

describe('SoundGrid', () => {
  it('renders all 4 category headers: Nature, Environments, Spiritual, Instruments', () => {
    render(
      <SoundGrid
        activeSoundIds={EMPTY_SET}
        loadingSoundIds={EMPTY_SET}
        errorSoundIds={EMPTY_SET}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByText('Nature')).toBeInTheDocument()
    expect(screen.getByText('Environments')).toBeInTheDocument()
    expect(screen.getByText('Spiritual')).toBeInTheDocument()
    expect(screen.getByText('Instruments')).toBeInTheDocument()
  })

  it('renders 24 sound cards total', () => {
    render(
      <SoundGrid
        activeSoundIds={EMPTY_SET}
        loadingSoundIds={EMPTY_SET}
        errorSoundIds={EMPTY_SET}
        onToggle={() => {}}
      />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(24)
  })

  it('passes isActive=true for sounds in activeSoundIds set', () => {
    render(
      <SoundGrid
        activeSoundIds={new Set(['gentle-rain'])}
        loadingSoundIds={EMPTY_SET}
        errorSoundIds={EMPTY_SET}
        onToggle={() => {}}
      />,
    )
    const rainBtn = screen.getByLabelText(/Gentle Rain — playing, tap to remove/)
    expect(rainBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('passes isLoading=true for sounds in loadingSoundIds set', () => {
    render(
      <SoundGrid
        activeSoundIds={EMPTY_SET}
        loadingSoundIds={new Set(['ocean-waves'])}
        errorSoundIds={EMPTY_SET}
        onToggle={() => {}}
      />,
    )
    const wavesBtn = screen.getByLabelText(/Loading Ocean Waves/)
    expect(wavesBtn).toHaveAttribute('aria-busy', 'true')
  })

  it('passes hasError=true for sounds in errorSoundIds set', () => {
    render(
      <SoundGrid
        activeSoundIds={EMPTY_SET}
        loadingSoundIds={EMPTY_SET}
        errorSoundIds={new Set(['fireplace'])}
        onToggle={() => {}}
      />,
    )
    const fpBtn = screen.getByLabelText(/Couldn't load Fireplace/)
    expect(fpBtn).toBeInTheDocument()
  })

  it('each category section has aria-labelledby linking to its header', () => {
    render(
      <SoundGrid
        activeSoundIds={EMPTY_SET}
        loadingSoundIds={EMPTY_SET}
        errorSoundIds={EMPTY_SET}
        onToggle={() => {}}
      />,
    )
    const sections = document.querySelectorAll('section')
    expect(sections).toHaveLength(4)

    for (const section of sections) {
      const labelledBy = section.getAttribute('aria-labelledby')
      expect(labelledBy).toBeTruthy()
      const header = section.querySelector(`#${labelledBy}`)
      expect(header).toBeInTheDocument()
    }
  })
})
