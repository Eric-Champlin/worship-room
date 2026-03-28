import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from '../AuthModal'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onShowToast: vi.fn(),
}

describe('AuthModal — validation', () => {
  it('shows email error on empty submit', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('shows email error on invalid format', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    const emailInput = screen.getByLabelText('Email address')
    // Use a format that jsdom's type=email accepts but our regex rejects
    await user.type(emailInput, 'user@x')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument()
  })

  it('email has aria-invalid on error', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows password error on empty', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    const emailInput = screen.getByLabelText('Email address')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('shows password error on short password', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByLabelText('Password')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'short')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByText('Password must be at least 12 characters')).toBeInTheDocument()
  })

  it('password has aria-invalid on error', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    const emailInput = screen.getByLabelText('Email address')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
  })

  it('errors clear on input change', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email address'), 'a')
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
  })
})
