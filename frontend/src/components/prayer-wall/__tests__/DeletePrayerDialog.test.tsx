import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeletePrayerDialog } from '../DeletePrayerDialog'

describe('DeletePrayerDialog', () => {
  it('renders Delete button', () => {
    render(<DeletePrayerDialog onDelete={vi.fn()} />)
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('opens dialog with cancel and delete buttons on click', async () => {
    const user = userEvent.setup()
    render(<DeletePrayerDialog onDelete={vi.fn()} />)
    await user.click(screen.getByText('Delete'))
    expect(screen.getByText('Delete Prayer Request')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('calls onDelete when Delete is confirmed', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<DeletePrayerDialog onDelete={onDelete} />)
    await user.click(screen.getByText('Delete'))
    const dialog = screen.getByRole('alertdialog')
    const confirmButton = within(dialog).getByRole('button', { name: 'Delete' })
    await user.click(confirmButton)
    expect(onDelete).toHaveBeenCalledOnce()
  })
})
