import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeleteMixDialog } from '../DeleteMixDialog'

describe('DeleteMixDialog', () => {
  const defaultProps = {
    mixName: 'Evening Calm',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows mix name in confirmation text', () => {
    render(<DeleteMixDialog {...defaultProps} />)
    expect(screen.getByText('Delete Evening Calm?')).toBeInTheDocument()
  })

  it('has role="alertdialog"', () => {
    render(<DeleteMixDialog {...defaultProps} />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('focus is trapped (first focusable element gets focus)', () => {
    render(<DeleteMixDialog {...defaultProps} />)
    // Cancel button should receive initial focus (first focusable)
    expect(screen.getByText('Cancel')).toHaveFocus()
  })

  it('"Delete" calls onConfirm', async () => {
    const user = userEvent.setup()
    render(<DeleteMixDialog {...defaultProps} />)

    await user.click(screen.getByText('Delete'))
    expect(defaultProps.onConfirm).toHaveBeenCalled()
  })

  it('"Cancel" calls onCancel', async () => {
    const user = userEvent.setup()
    render(<DeleteMixDialog {...defaultProps} />)

    await user.click(screen.getByText('Cancel'))
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })
})
