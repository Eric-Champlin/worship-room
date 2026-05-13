import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WatchToggle } from '../WatchToggle'

describe('WatchToggle (Spec 6.4)', () => {
  it('renders 3 radio options (Off / Auto / Always during late hours) with descriptions', () => {
    render(<WatchToggle value="off" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: /off/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /auto/i })).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: /always during late hours/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Watch never activates.')).toBeInTheDocument()
  })

  it('marks the current value as aria-checked', () => {
    render(<WatchToggle value="auto" onChange={() => {}} />)
    const autoRadio = screen.getByRole('radio', { name: /auto/i })
    expect(autoRadio).toHaveAttribute('aria-checked', 'true')
  })

  it('opens confirmation modal when "On" radio tapped (does NOT immediately call onChange)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<WatchToggle value="off" onChange={onChange} />)
    await user.click(
      screen.getByRole('radio', { name: /always during late hours/i }),
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('opens confirmation modal when "Auto" radio tapped', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<WatchToggle value="off" onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: /auto/i }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('calls onChange("off") immediately when "Off" radio tapped (D-OptOutFriction)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<WatchToggle value="on" onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: /^off$/i }))
    expect(onChange).toHaveBeenCalledWith('off')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('persists pending value on modal confirm', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<WatchToggle value="off" onChange={onChange} />)
    await user.click(
      screen.getByRole('radio', { name: /always during late hours/i }),
    )
    await user.click(screen.getByRole('button', { name: /yes, turn on/i }))
    expect(onChange).toHaveBeenCalledWith('on')
  })

  it('reverts to previous value on modal decline (does NOT persist)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<WatchToggle value="off" onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: /auto/i }))
    await user.click(screen.getByRole('button', { name: /not right now/i }))
    expect(onChange).not.toHaveBeenCalled()
    // toggle stays at 'off'
    expect(screen.getByRole('radio', { name: /^off$/i })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  // WAI-ARIA Radio Group pattern — arrow keys are the only way to change
  // selection once focus is inside a roving-tabindex group. Without these
  // handlers keyboard-only users cannot move between options.
  it('ArrowDown from "Off" opens confirm modal targeted at "Auto" (next option)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<WatchToggle value="off" onChange={onChange} />)
    const offRadio = screen.getByRole('radio', { name: /^off$/i })
    offRadio.focus()
    await user.keyboard('{ArrowDown}')
    // Opt-in target — confirmation modal opens; nothing persists yet.
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ArrowRight wraps from "On" back to "Off" and persists immediately (D-OptOutFriction)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<WatchToggle value="on" onChange={onChange} />)
    const onRadio = screen.getByRole('radio', { name: /always during late hours/i })
    onRadio.focus()
    // From last option, ArrowRight wraps to first ("Off"). Off persists immediately.
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('off')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('ArrowUp from "Off" wraps to "On" and opens confirm modal', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<WatchToggle value="off" onChange={onChange} />)
    const offRadio = screen.getByRole('radio', { name: /^off$/i })
    offRadio.focus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('only the selected radio has tabIndex=0; others are -1 (roving tabindex)', () => {
    render(<WatchToggle value="auto" onChange={() => {}} />)
    const radios = screen.getAllByRole('radio')
    const withTabZero = radios.filter((r) => r.getAttribute('tabindex') === '0')
    expect(withTabZero).toHaveLength(1)
    expect(withTabZero[0]).toHaveAttribute('aria-checked', 'true')
  })
})
