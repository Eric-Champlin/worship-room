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

describe('AuthModal — homepage visual style', () => {
  it('renders frosted glass modal container', () => {
    const { container } = render(<AuthModal {...defaultProps} />)
    const modal = container.querySelector('[role="dialog"]')
    expect(modal?.className).toContain('bg-hero-mid/95')
    expect(modal?.className).toContain('backdrop-blur-md')
    expect(modal?.className).toContain('rounded-3xl')
  })

  it('backdrop has inline style for atmospheric glow', () => {
    const { container } = render(<AuthModal {...defaultProps} />)
    const backdrop = container.firstElementChild as HTMLElement
    expect(backdrop?.hasAttribute('style')).toBe(true)
  })

  it('inputs have frosted glass styling', () => {
    render(<AuthModal {...defaultProps} />)
    const emailInput = screen.getByLabelText('Email address')
    expect(emailInput.className).toContain('bg-white/[0.06]')
    expect(emailInput.className).toContain('border-white/[0.12]')
  })

  it('close button has white/50 text', () => {
    render(<AuthModal {...defaultProps} />)
    const closeBtn = screen.getByLabelText('Close')
    expect(closeBtn.className).toContain('text-white/50')
  })

  it('error messages use red-400', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    const errorEl = screen.getByText('Email is required')
    expect(errorEl.className).toContain('text-red-400')
  })

  it('Spotify button has transparent border style with green icon', () => {
    render(<AuthModal {...defaultProps} />)
    const spotifyBtn = screen.getByLabelText('Continue with Spotify')
    expect(spotifyBtn.className).toContain('border-white/[0.12]')
    expect(spotifyBtn.className).toContain('text-white')
    const icon = spotifyBtn.querySelector('svg')
    expect(icon?.getAttribute('class')).toContain('text-[#1DB954]')
  })

  it('toggle links use purple-400', () => {
    render(<AuthModal {...defaultProps} />)
    const createLink = screen.getByRole('button', { name: 'Create one!' })
    expect(createLink.className).toContain('text-purple-400')
  })

  it('title uses gradient text style (not script font)', () => {
    const { container } = render(<AuthModal {...defaultProps} />)
    const title = container.querySelector('#auth-modal-title')
    expect(title?.className).not.toContain('font-script')
    expect(title?.getAttribute('style')).toContain('background-clip')
  })

  it('labels use text-white and purple-400 asterisks', () => {
    render(<AuthModal {...defaultProps} />)
    const emailLabel = screen.getByText('Email').closest('label')
    expect(emailLabel?.className).toContain('text-white')
    const asterisk = emailLabel?.querySelector('[aria-hidden="true"]')
    expect(asterisk?.className).toContain('text-purple-400')
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

describe('AuthModal — register validation', () => {
  const registerProps = { ...defaultProps, initialView: 'register' as const }

  it('first name shows inline error on blur when empty', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />)
    const firstNameInput = screen.getByLabelText(/First name/i)
    await user.click(firstNameInput)
    await user.tab()
    expect(screen.getByText('First name is required')).toBeInTheDocument()
  })

  it('first name has aria-invalid when error shows', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />)
    const firstNameInput = screen.getByLabelText(/First name/i)
    await user.click(firstNameInput)
    await user.tab()
    expect(firstNameInput).toHaveAttribute('aria-invalid', 'true')
  })

  it('last name shows inline error on blur when empty', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />)
    const lastNameInput = screen.getByLabelText(/Last name/i)
    await user.click(lastNameInput)
    await user.tab()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
  })

  it('confirm password shows "Passwords do not match" when mismatched', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />)
    const passwordInput = screen.getByLabelText('Password')
    const confirmInput = screen.getByLabelText(/Confirm password/i)
    await user.type(passwordInput, 'securepassword1')
    await user.type(confirmInput, 'differentpassword')
    await user.tab()
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('confirm password error clears when passwords match', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />)
    const passwordInput = screen.getByLabelText('Password')
    const confirmInput = screen.getByLabelText(/Confirm password/i)
    await user.type(passwordInput, 'securepassword1')
    await user.type(confirmInput, 'differentpass')
    await user.tab()
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    await user.clear(confirmInput)
    await user.type(confirmInput, 'securepassword1')
    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
  })

  it('all 5 fields show required indicator', () => {
    render(<AuthModal {...registerProps} />)
    const srOnlyTexts = screen.getAllByText('required', { exact: false })
    // 5 fields × 1 sr-only "required" text each
    expect(srOnlyTexts.length).toBeGreaterThanOrEqual(5)
  })

  it('submit with empty fields shows all inline errors', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />)
    await user.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(screen.getByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(screen.getByText('Confirm password is required')).toBeInTheDocument()
  })

  it('login fields have required attribute', () => {
    render(<AuthModal {...defaultProps} />)
    expect(screen.getByLabelText('Email address')).toHaveAttribute('required')
    expect(screen.getByLabelText('Password')).toHaveAttribute('required')
  })
})

describe('AuthModal — password reset validation', () => {
  it('empty email shows inline error', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('email has aria-invalid on error', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    const resetEmailInput = screen.getByLabelText(/Email/i)
    expect(resetEmailInput).toHaveAttribute('aria-invalid', 'true')
  })
})
