import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReminderToggle } from '../ReminderToggle'

describe('ReminderToggle', () => {
  it('renders toggle with "Remind me" label', () => {
    render(
      <ReminderToggle
        enabled={false}
        time="09:00"
        onToggle={vi.fn()}
        onTimeChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Remind me')).toBeInTheDocument()
  })

  it('has role="switch" with aria-checked', () => {
    render(
      <ReminderToggle
        enabled={true}
        time="09:00"
        onToggle={vi.fn()}
        onTimeChange={vi.fn()}
      />,
    )

    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onToggle when clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <ReminderToggle
        enabled={false}
        time="09:00"
        onToggle={onToggle}
        onTimeChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('switch'))
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('shows time input when enabled', () => {
    render(
      <ReminderToggle
        enabled={true}
        time="09:00"
        onToggle={vi.fn()}
        onTimeChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Reminder time')).toBeInTheDocument()
  })

  it('hides time input when disabled', () => {
    render(
      <ReminderToggle
        enabled={false}
        time="09:00"
        onToggle={vi.fn()}
        onTimeChange={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText('Reminder time')).not.toBeInTheDocument()
  })

  it('calls onTimeChange when time changes', async () => {
    const user = userEvent.setup()
    const onTimeChange = vi.fn()
    render(
      <ReminderToggle
        enabled={true}
        time="09:00"
        onToggle={vi.fn()}
        onTimeChange={onTimeChange}
      />,
    )

    const input = screen.getByLabelText('Reminder time')
    await user.clear(input)
    await user.type(input, '14:30')
    expect(onTimeChange).toHaveBeenCalled()
  })

  it('tooltip text is accessible via aria-describedby', () => {
    render(
      <ReminderToggle
        enabled={true}
        time="09:00"
        onToggle={vi.fn()}
        onTimeChange={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Reminder time')
    const describedById = input.getAttribute('aria-describedby')
    expect(describedById).toBeTruthy()
    const tooltip = document.getElementById(describedById!)
    expect(tooltip).toBeInTheDocument()
    expect(tooltip?.getAttribute('title')).toContain('Push notification timing coming soon')
  })
})
