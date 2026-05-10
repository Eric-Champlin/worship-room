import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WaysToHelpPicker } from '../WaysToHelpPicker'
import type { HelpTag } from '@/constants/ways-to-help'

describe('WaysToHelpPicker', () => {
  it('renders all 5 chips in canonical order', () => {
    render(<WaysToHelpPicker value={[]} onChange={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Meals',
      'Rides',
      'Errands',
      'Visits',
      'Just prayer, please',
    ])
  })

  it('each chip is a button with aria-pressed reflecting selection', () => {
    render(<WaysToHelpPicker value={[]} onChange={() => {}} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((b) => {
      expect(b).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('tapping a chip toggles its selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<WaysToHelpPicker value={[]} onChange={onChange} />)
    await user.click(screen.getByText('Meals'))
    expect(onChange).toHaveBeenCalledWith(['meals'])
  })

  it('selecting multiple chips works', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    // Simulate the parent toggling state — first click yields ['meals'].
    const { rerender } = render(
      <WaysToHelpPicker value={[]} onChange={onChange} />,
    )
    await user.click(screen.getByText('Meals'))
    expect(onChange).toHaveBeenLastCalledWith(['meals'])

    // Re-render with the new value — second click yields ['meals', 'rides'].
    rerender(<WaysToHelpPicker value={['meals']} onChange={onChange} />)
    await user.click(screen.getByText('Rides'))
    expect(onChange).toHaveBeenLastCalledWith(['meals', 'rides'])
  })

  it('deselecting a chip works', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const value: HelpTag[] = ['meals']
    render(<WaysToHelpPicker value={value} onChange={onChange} />)
    await user.click(screen.getByText('Meals'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('Tab cycles focus through chips and Space toggles', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<WaysToHelpPicker value={[]} onChange={onChange} />)

    // Tab into the first chip.
    await user.tab()
    expect(screen.getByText('Meals')).toHaveFocus()

    // Space activates the focused button.
    await user.keyboard(' ')
    expect(onChange).toHaveBeenLastCalledWith(['meals'])

    // Tab to the next chip.
    await user.tab()
    expect(screen.getByText('Rides')).toHaveFocus()
  })

  it('helper text rendered when prop provided', () => {
    render(
      <WaysToHelpPicker
        value={[]}
        onChange={() => {}}
        helperText="Optional — leave blank if prayer is what you need right now."
      />,
    )
    expect(
      screen.getByText(
        'Optional — leave blank if prayer is what you need right now.',
      ),
    ).toBeInTheDocument()
  })
})
