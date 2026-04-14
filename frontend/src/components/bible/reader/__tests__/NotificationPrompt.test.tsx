import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationPrompt } from '../NotificationPrompt'

describe('NotificationPrompt', () => {
  const defaultProps = {
    onEnable: vi.fn(),
    onDismiss: vi.fn(),
    iosNeedsInstall: false,
  }

  it('renders heading and body text', () => {
    render(<NotificationPrompt {...defaultProps} />)
    expect(screen.getByText('Never miss your daily verse')).toBeInTheDocument()
    expect(screen.getByText(/verse delivered to your device/)).toBeInTheDocument()
  })

  it('renders Enable and Maybe later buttons', () => {
    render(<NotificationPrompt {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Maybe later' })).toBeInTheDocument()
  })

  it('Enable button calls onEnable', async () => {
    const user = userEvent.setup()
    const onEnable = vi.fn()
    render(<NotificationPrompt {...defaultProps} onEnable={onEnable} />)
    await user.click(screen.getByRole('button', { name: 'Enable' }))
    expect(onEnable).toHaveBeenCalledTimes(1)
  })

  it('Maybe later button calls onDismiss', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<NotificationPrompt {...defaultProps} onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: 'Maybe later' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('has complementary role for accessibility', () => {
    render(<NotificationPrompt {...defaultProps} />)
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  // --- iOS variant ---
  it('iOS variant shows install instructions', () => {
    render(<NotificationPrompt {...defaultProps} iosNeedsInstall={true} />)
    expect(screen.getByText(/verse notifications on iOS/)).toBeInTheDocument()
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument()
  })

  it('iOS variant shows "Got it" button instead of Enable/Maybe later', () => {
    render(<NotificationPrompt {...defaultProps} iosNeedsInstall={true} />)
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enable' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Maybe later' })).not.toBeInTheDocument()
  })

  it('iOS "Got it" button calls onDismiss', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<NotificationPrompt {...defaultProps} iosNeedsInstall={true} onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: 'Got it' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
