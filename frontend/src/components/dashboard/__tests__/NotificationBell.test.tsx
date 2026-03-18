import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { NotificationBell } from '../NotificationBell'

describe('NotificationBell', () => {
  it('renders bell button', () => {
    render(<NotificationBell unreadCount={0} isOpen={false} onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('shows correct unread count on badge', () => {
    render(<NotificationBell unreadCount={5} isOpen={false} onToggle={vi.fn()} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows "9+" when count > 9', () => {
    render(<NotificationBell unreadCount={15} isOpen={false} onToggle={vi.fn()} />)
    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('hides badge when unreadCount is 0', () => {
    const { container } = render(<NotificationBell unreadCount={0} isOpen={false} onToggle={vi.fn()} />)
    const badge = container.querySelector('.bg-red-500')
    expect(badge).toBeNull()
  })

  it('clicking bell calls onToggle', async () => {
    const onToggle = vi.fn()
    render(<NotificationBell unreadCount={3} isOpen={false} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('aria-label includes unread count when > 0', () => {
    render(<NotificationBell unreadCount={5} isOpen={false} onToggle={vi.fn()} />)
    expect(screen.getByLabelText('Notifications, 5 unread')).toBeInTheDocument()
  })

  it('aria-label is just "Notifications" when count is 0', () => {
    render(<NotificationBell unreadCount={0} isOpen={false} onToggle={vi.fn()} />)
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
  })

  it('aria-expanded reflects isOpen state', () => {
    const { rerender } = render(<NotificationBell unreadCount={0} isOpen={false} onToggle={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')

    rerender(<NotificationBell unreadCount={0} isOpen={true} onToggle={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('has aria-haspopup="dialog"', () => {
    render(<NotificationBell unreadCount={0} isOpen={false} onToggle={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-haspopup', 'dialog')
  })
})
