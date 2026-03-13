import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SoundGrid } from '../SoundGrid'

const EMPTY_SET = new Set<string>()

function renderGrid() {
  return render(
    <SoundGrid
      activeSoundIds={EMPTY_SET}
      loadingSoundIds={EMPTY_SET}
      errorSoundIds={EMPTY_SET}
      onToggle={() => {}}
    />,
  )
}

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

  describe('keyboard navigation', () => {
    beforeEach(() => {
      // jsdom defaults innerWidth to 0 → 3 cols in SoundGrid
      Object.defineProperty(window, 'innerWidth', { value: 400, writable: true })
    })

    it('first sound has tabIndex=0, rest have tabIndex=-1 (roving tabindex)', () => {
      renderGrid()
      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveAttribute('tabindex', '0')
      expect(buttons[1]).toHaveAttribute('tabindex', '-1')
      expect(buttons[buttons.length - 1]).toHaveAttribute('tabindex', '-1')
    })

    it('ArrowRight moves focus to next sound', async () => {
      const user = userEvent.setup()
      renderGrid()
      const buttons = screen.getAllByRole('button')

      buttons[0].focus()
      await user.keyboard('{ArrowRight}')

      expect(buttons[1]).toHaveFocus()
    })

    it('ArrowLeft moves focus to previous sound', async () => {
      const user = userEvent.setup()
      renderGrid()
      const buttons = screen.getAllByRole('button')

      // Focus second button, then press left
      buttons[0].focus()
      await user.keyboard('{ArrowRight}')
      await user.keyboard('{ArrowLeft}')

      expect(buttons[0]).toHaveFocus()
    })

    it('ArrowDown moves focus down by column count', async () => {
      const user = userEvent.setup()
      renderGrid()
      const buttons = screen.getAllByRole('button')

      // innerWidth=400 → 3 cols, so ArrowDown moves +3
      buttons[0].focus()
      await user.keyboard('{ArrowDown}')

      expect(buttons[3]).toHaveFocus()
    })

    it('ArrowUp moves focus up by column count', async () => {
      const user = userEvent.setup()
      renderGrid()
      const buttons = screen.getAllByRole('button')

      // Move to row 2 first, then back up
      buttons[0].focus()
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowUp}')

      expect(buttons[0]).toHaveFocus()
    })

    it('Home moves focus to first sound', async () => {
      const user = userEvent.setup()
      renderGrid()
      const buttons = screen.getAllByRole('button')

      buttons[0].focus()
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
      await user.keyboard('{Home}')

      expect(buttons[0]).toHaveFocus()
    })

    it('End moves focus to last sound', async () => {
      const user = userEvent.setup()
      renderGrid()
      const buttons = screen.getAllByRole('button')

      buttons[0].focus()
      await user.keyboard('{End}')

      expect(buttons[buttons.length - 1]).toHaveFocus()
    })

    it('ArrowLeft at first sound does not move focus', async () => {
      const user = userEvent.setup()
      renderGrid()
      const buttons = screen.getAllByRole('button')

      buttons[0].focus()
      await user.keyboard('{ArrowLeft}')

      expect(buttons[0]).toHaveFocus()
    })

    it('ArrowRight at last sound does not move focus', async () => {
      const user = userEvent.setup()
      renderGrid()
      const buttons = screen.getAllByRole('button')

      buttons[0].focus()
      await user.keyboard('{End}')
      await user.keyboard('{ArrowRight}')

      expect(buttons[buttons.length - 1]).toHaveFocus()
    })
  })
})
