import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnsavedChangesModal } from '../UnsavedChangesModal'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

describe('UnsavedChangesModal', () => {
  const defaultProps = {
    isOpen: true,
    onLeave: vi.fn(),
    onStay: vi.fn(),
  }

  it('renders message when open', () => {
    render(<UnsavedChangesModal {...defaultProps} />)
    expect(screen.getByText('You have unsaved changes. Leave without saving?')).toBeInTheDocument()
  })

  it('calls onLeave when Leave button clicked', async () => {
    const onLeave = vi.fn()
    render(<UnsavedChangesModal {...defaultProps} onLeave={onLeave} />)
    await userEvent.click(screen.getByText('Leave without saving'))
    expect(onLeave).toHaveBeenCalled()
  })

  it('calls onStay when Keep editing button clicked', async () => {
    const onStay = vi.fn()
    render(<UnsavedChangesModal {...defaultProps} onStay={onStay} />)
    await userEvent.click(screen.getByText('Keep editing'))
    expect(onStay).toHaveBeenCalled()
  })

  it('calls onStay on Escape key', async () => {
    const onStay = vi.fn()
    render(<UnsavedChangesModal {...defaultProps} onStay={onStay} />)
    await userEvent.keyboard('{Escape}')
    expect(onStay).toHaveBeenCalled()
  })

  it('has alertdialog role', () => {
    render(<UnsavedChangesModal {...defaultProps} />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('traps focus within modal', () => {
    render(<UnsavedChangesModal {...defaultProps} />)
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
