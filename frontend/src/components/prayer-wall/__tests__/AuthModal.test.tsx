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

describe('AuthModal — dark theme', () => {
  it('renders dark frosted glass background', () => {
    const { container } = render(<AuthModal {...defaultProps} />)
    const modal = container.querySelector('[role="dialog"]')
    expect(modal?.className).toContain('bg-hero-mid/95')
    expect(modal?.className).toContain('backdrop-blur-xl')
  })

  it('inputs have dark styling', () => {
    render(<AuthModal {...defaultProps} />)
    const emailInput = screen.getByLabelText('Email address')
    expect(emailInput.className).toContain('bg-white/[0.06]')
  })

  it('close button has white/60 text', () => {
    render(<AuthModal {...defaultProps} />)
    const closeBtn = screen.getByLabelText('Close')
    expect(closeBtn.className).toContain('text-white/60')
  })

  it('error messages use red-400', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    const errorEl = screen.getByText('Email is required')
    expect(errorEl.className).toContain('text-red-400')
  })

  it('Spotify button has ghost green style', () => {
    render(<AuthModal {...defaultProps} />)
    const spotifyBtn = screen.getByLabelText('Continue with Spotify')
    expect(spotifyBtn.className).toContain('border-[#1DB954]/30')
    expect(spotifyBtn.className).toContain('text-[#1DB954]')
  })

  it('toggle links use primary-lt', () => {
    render(<AuthModal {...defaultProps} />)
    const createLink = screen.getByRole('button', { name: 'Create one!' })
    expect(createLink.className).toContain('text-primary-lt')
  })
})

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
