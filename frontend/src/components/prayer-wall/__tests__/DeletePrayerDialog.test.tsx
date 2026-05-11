import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeletePrayerDialog } from '../DeletePrayerDialog'

describe('DeletePrayerDialog', () => {
  it('renders Remove button', () => {
    render(<DeletePrayerDialog onDelete={vi.fn()} />)
    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('opens dialog with cancel and remove buttons on click', async () => {
    const user = userEvent.setup()
    render(<DeletePrayerDialog onDelete={vi.fn()} />)
    await user.click(screen.getByText('Remove'))
    expect(screen.getByText('Remove this prayer?')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('calls onDelete when Remove is confirmed', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<DeletePrayerDialog onDelete={onDelete} />)
    await user.click(screen.getByText('Remove'))
    const dialog = screen.getByRole('alertdialog')
    const confirmButton = within(dialog).getByRole('button', { name: 'Remove' })
    await user.click(confirmButton)
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('renders FrostedCard with canonical radius inside dialog', async () => {
    const user = userEvent.setup()
    const { container } = render(<DeletePrayerDialog onDelete={vi.fn()} />)
    await user.click(screen.getByText('Remove'))
    expect(container.querySelector('[class*="rounded-3xl"]')).toBeInTheDocument()
  })
})
