import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { RoutineInterruptDialog } from '../RoutineInterruptDialog'

const DEFAULT_PROPS = {
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
}

describe('RoutineInterruptDialog', () => {
  it('renders with correct text', () => {
    render(<RoutineInterruptDialog {...DEFAULT_PROPS} />)

    expect(
      screen.getByText('This will end your current routine. Continue?'),
    ).toBeInTheDocument()
  })

  it('"End Routine" button calls onConfirm', async () => {
    const onConfirm = vi.fn()
    render(<RoutineInterruptDialog {...DEFAULT_PROPS} onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole('button', { name: 'End Routine' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('"Keep Routine" button calls onCancel', async () => {
    const onCancel = vi.fn()
    render(<RoutineInterruptDialog {...DEFAULT_PROPS} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Keep Routine' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('has role="alertdialog" and aria-modal="true"', () => {
    render(<RoutineInterruptDialog {...DEFAULT_PROPS} />)

    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
