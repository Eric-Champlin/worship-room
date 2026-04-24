import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from '../AuthModal'
import { AuthProvider } from '@/contexts/AuthContext'
import type { ReactNode } from 'react'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onShowToast: vi.fn(),
}

function Wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

function renderModal(overrides: Partial<typeof defaultProps> = {}) {
  return render(<AuthModal {...defaultProps} {...overrides} />, {
    wrapper: Wrapper,
  })
}

const SAMPLE_USER_SUMMARY = {
  id: 'uuid-abc',
  email: 'sarah@example.com',
  displayName: 'Sarah',
  firstName: 'Sarah',
  lastName: 'Smith',
  isAdmin: false,
  timezone: 'America/Chicago',
}

describe('AuthModal — homepage visual style', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders frosted glass modal container', () => {
    const { container } = renderModal()
    const modal = container.querySelector('[role="dialog"]')
    expect(modal?.className).toContain('bg-hero-bg/95')
    expect(modal?.className).toContain('backdrop-blur-md')
    expect(modal?.className).toContain('rounded-3xl')
  })

  it('backdrop has inline style for atmospheric glow', () => {
    const { container } = renderModal()
    const backdrop = container.firstElementChild as HTMLElement
    expect(backdrop?.hasAttribute('style')).toBe(true)
  })

  it('inputs have frosted glass styling', () => {
    renderModal()
    const emailInput = screen.getByLabelText('Email address')
    expect(emailInput.className).toContain('bg-white/[0.06]')
    expect(emailInput.className).toContain('border-white/[0.12]')
  })

  it('close button has white/50 text', () => {
    renderModal()
    const closeBtn = screen.getByLabelText('Close')
    expect(closeBtn.className).toContain('text-white/50')
  })

  it('error messages use red-400 (inline field errors)', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    const errorEl = screen.getByText('Email is required')
    expect(errorEl.className).toContain('text-red-400')
  })

  it('Spotify button has transparent border style with green icon', () => {
    renderModal()
    const spotifyBtn = screen.getByLabelText('Continue with Spotify')
    expect(spotifyBtn.className).toContain('border-white/[0.12]')
    expect(spotifyBtn.className).toContain('text-white')
    const icon = spotifyBtn.querySelector('svg')
    expect(icon?.getAttribute('class')).toContain('text-[#1DB954]')
  })

  it('toggle links use purple-400', () => {
    renderModal()
    const createLink = screen.getByRole('button', { name: 'Create one!' })
    expect(createLink.className).toContain('text-purple-400')
  })

  it('title uses gradient text style (not script font)', () => {
    const { container } = renderModal()
    const title = container.querySelector('#auth-modal-title')
    expect(title?.className).not.toContain('font-script')
    expect(title?.getAttribute('style')).toContain('background-clip')
  })

  it('labels use text-white and purple-400 asterisks', () => {
    renderModal()
    const emailLabel = screen.getByText('Email').closest('label')
    expect(emailLabel?.className).toContain('text-white')
    const asterisk = emailLabel?.querySelector('[aria-hidden="true"]')
    expect(asterisk?.className).toContain('text-purple-400')
  })
})

describe('AuthModal — validation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows email error on empty submit', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('shows email error on invalid format', async () => {
    const user = userEvent.setup()
    renderModal()
    const emailInput = screen.getByLabelText('Email address')
    await user.type(emailInput, 'user@x')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument()
  })

  it('email has aria-invalid on error', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByLabelText('Email address')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('shows password error on empty', async () => {
    const user = userEvent.setup()
    renderModal()
    const emailInput = screen.getByLabelText('Email address')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('shows password error on short password', async () => {
    const user = userEvent.setup()
    renderModal()
    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByLabelText('Password')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'short')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(
      screen.getByText('Password must be at least 12 characters'),
    ).toBeInTheDocument()
  })

  it('password has aria-invalid on error', async () => {
    const user = userEvent.setup()
    renderModal()
    const emailInput = screen.getByLabelText('Email address')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('errors clear on input change', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email address'), 'a')
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
  })
})

describe('AuthModal — register validation', () => {
  const registerProps = { ...defaultProps, initialView: 'register' as const }

  beforeEach(() => {
    localStorage.clear()
  })

  it('first name shows inline error on blur when empty', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />, { wrapper: Wrapper })
    const firstNameInput = screen.getByLabelText(/First name/i)
    await user.click(firstNameInput)
    await user.tab()
    expect(screen.getByText('First name is required')).toBeInTheDocument()
  })

  it('first name has aria-invalid when error shows', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />, { wrapper: Wrapper })
    const firstNameInput = screen.getByLabelText(/First name/i)
    await user.click(firstNameInput)
    await user.tab()
    expect(firstNameInput).toHaveAttribute('aria-invalid', 'true')
  })

  it('last name shows inline error on blur when empty', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />, { wrapper: Wrapper })
    const lastNameInput = screen.getByLabelText(/Last name/i)
    await user.click(lastNameInput)
    await user.tab()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
  })

  it('confirm password shows "Passwords do not match" when mismatched', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />, { wrapper: Wrapper })
    const passwordInput = screen.getByLabelText('Password')
    const confirmInput = screen.getByLabelText(/Confirm password/i)
    await user.type(passwordInput, 'securepassword1')
    await user.type(confirmInput, 'differentpassword')
    await user.tab()
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('confirm password error clears when passwords match', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />, { wrapper: Wrapper })
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
    render(<AuthModal {...registerProps} />, { wrapper: Wrapper })
    const srOnlyTexts = screen.getAllByText('required', { exact: false })
    expect(srOnlyTexts.length).toBeGreaterThanOrEqual(5)
  })

  it('submit with empty fields shows all inline errors', async () => {
    const user = userEvent.setup()
    render(<AuthModal {...registerProps} />, { wrapper: Wrapper })
    await user.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(screen.getByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(
      screen.getByText('Confirm password is required'),
    ).toBeInTheDocument()
  })

  it('login fields have required attribute', () => {
    renderModal()
    expect(screen.getByLabelText('Email address')).toHaveAttribute('required')
    expect(screen.getByLabelText('Password')).toHaveAttribute('required')
  })
})

describe('AuthModal — password reset validation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('empty email shows inline error', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('email has aria-invalid on error', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    const resetEmailInput = screen.getByLabelText(/Email/i)
    expect(resetEmailInput).toHaveAttribute('aria-invalid', 'true')
  })
})

// ---------------------------------------------------------------------------
// Backend integration tests (new in Spec 1.9)
// ---------------------------------------------------------------------------

describe('AuthModal — backend integration', () => {
  let fetchSpy: Mock

  beforeEach(() => {
    localStorage.clear()
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    defaultProps.onClose = vi.fn()
    defaultProps.onShowToast = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('login submit posts credentials to /api/v1/auth/login', async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        data: { token: 'jwt.t', user: SAMPLE_USER_SUMMARY },
        meta: {},
      }),
    )
    renderModal()
    await user.type(screen.getByLabelText('Email address'), 'sarah@example.com')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/api/v1/auth/login')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({
      email: 'sarah@example.com',
      password: 'long-enough-password',
    })
  })

  it('login submit shows isLoading on button during submit', async () => {
    const user = userEvent.setup()
    let resolveLoginResponse: (r: Response) => void = () => {}
    const loginPromise = new Promise<Response>((resolve) => {
      resolveLoginResponse = resolve
    })
    fetchSpy.mockReturnValueOnce(loginPromise)

    renderModal()
    await user.type(screen.getByLabelText('Email address'), 'a@b.c')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    const submitBtn = screen.getByRole('button', { name: 'Log In' })
    await user.click(submitBtn)

    // While pending, submit button is aria-busy (Button.isLoading sets it)
    await waitFor(() => {
      expect(submitBtn).toHaveAttribute('aria-busy')
    })

    resolveLoginResponse(
      jsonResponse(200, {
        data: { token: 't', user: SAMPLE_USER_SUMMARY },
        meta: {},
      }),
    )

    await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalled())
  })

  it('login 401 INVALID_CREDENTIALS shows form-level FormError', async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(401, {
        code: 'INVALID_CREDENTIALS',
        message: 'bad',
        requestId: 'r',
      }),
    )
    renderModal()
    await user.type(screen.getByLabelText('Email address'), 'bad@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-pass-1234')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          /That email and password don't match our records/,
        ),
      ).toBeInTheDocument()
    })
  })

  it('login 429 RATE_LIMITED shows Too many attempts copy', async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(429, {
        code: 'RATE_LIMITED',
        message: 'rate limit',
        requestId: 'r',
      }),
    )
    renderModal()
    await user.type(screen.getByLabelText('Email address'), 'x@y.z')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => {
      expect(screen.getByText(/Too many attempts/)).toBeInTheDocument()
    })
  })

  it('network error shows NETWORK_ERROR copy', async () => {
    const user = userEvent.setup()
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    renderModal()
    await user.type(screen.getByLabelText('Email address'), 'x@y.z')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => {
      expect(
        screen.getByText(/couldn't reach the server/),
      ).toBeInTheDocument()
    })
  })

  it('register submit sends captured timezone', async () => {
    const user = userEvent.setup()
    // Stub Intl
    const originalIntl = Intl.DateTimeFormat
    const mockIntl = vi.fn(() => ({
      resolvedOptions: () => ({ timeZone: 'America/Chicago' }),
    })) as unknown as typeof Intl.DateTimeFormat
    // Preserve static methods if accessed (none needed here)
    ;(globalThis as { Intl: typeof Intl }).Intl = {
      ...Intl,
      DateTimeFormat: mockIntl,
    } as typeof Intl

    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { registered: true }, meta: {} }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: { token: 't', user: SAMPLE_USER_SUMMARY },
          meta: {},
        }),
      )

    render(<AuthModal {...defaultProps} initialView="register" />, {
      wrapper: Wrapper,
    })
    await user.type(screen.getByLabelText(/First name/i), 'New')
    await user.type(screen.getByLabelText(/Last name/i), 'User')
    await user.type(screen.getByLabelText('Email address'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    await user.type(
      screen.getByLabelText(/Confirm password/i),
      'long-enough-password',
    )
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    const registerCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).endsWith('/api/v1/auth/register'),
    )
    expect(registerCall).toBeTruthy()
    const body = JSON.parse(registerCall![1].body as string)
    expect(body.timezone).toBe('America/Chicago')

    ;(globalThis as { Intl: typeof Intl }).Intl = {
      ...Intl,
      DateTimeFormat: originalIntl,
    } as typeof Intl
  })

  it('register submit chains to auto-login', async () => {
    const user = userEvent.setup()
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { registered: true }, meta: {} }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: { token: 't', user: SAMPLE_USER_SUMMARY },
          meta: {},
        }),
      )

    render(<AuthModal {...defaultProps} initialView="register" />, {
      wrapper: Wrapper,
    })
    await user.type(screen.getByLabelText(/First name/i), 'New')
    await user.type(screen.getByLabelText(/Last name/i), 'User')
    await user.type(screen.getByLabelText('Email address'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    await user.type(
      screen.getByLabelText(/Confirm password/i),
      'long-enough-password',
    )
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/v1/auth/register')
    expect(String(fetchSpy.mock.calls[1][0])).toContain('/api/v1/auth/login')
  })

  it('register → auto-login 401 shows AUTO_LOGIN_FAILED copy', async () => {
    const user = userEvent.setup()
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { registered: true }, meta: {} }),
      )
      .mockResolvedValueOnce(
        jsonResponse(401, {
          code: 'INVALID_CREDENTIALS',
          message: 'bad',
          requestId: 'r',
        }),
      )

    render(<AuthModal {...defaultProps} initialView="register" />, {
      wrapper: Wrapper,
    })
    await user.type(screen.getByLabelText(/First name/i), 'Exist')
    await user.type(screen.getByLabelText(/Last name/i), 'User')
    await user.type(
      screen.getByLabelText('Email address'),
      'existing@example.com',
    )
    await user.type(screen.getByLabelText('Password'), 'wrong-pass-1234')
    await user.type(
      screen.getByLabelText(/Confirm password/i),
      'wrong-pass-1234',
    )
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          /Your account is ready\. Please log in to continue/,
        ),
      ).toBeInTheDocument()
    })
  })

  it('focus-on-validation-error moves focus to first invalid field', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByLabelText('Email address'),
      )
    })
  })

  it('focus-on-error moves focus to form-level FormError', async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(401, {
        code: 'INVALID_CREDENTIALS',
        message: 'bad',
        requestId: 'r',
      }),
    )
    renderModal()
    await user.type(screen.getByLabelText('Email address'), 'bad@example.com')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => {
      expect(
        screen.getByText(/don't match our records/),
      ).toBeInTheDocument()
    })
    // Focus should have moved to the focusable wrapper div around FormError
    await waitFor(() => {
      const active = document.activeElement as HTMLElement | null
      expect(active?.getAttribute('tabindex')).toBe('-1')
    })
  })

  it('successful login closes modal', async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        data: { token: 't', user: SAMPLE_USER_SUMMARY },
        meta: {},
      }),
    )
    const onClose = vi.fn()
    render(<AuthModal {...defaultProps} onClose={onClose} />, {
      wrapper: Wrapper,
    })
    await user.type(screen.getByLabelText('Email address'), 'x@y.z')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('form-level error dismiss button clears error', async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(401, {
        code: 'INVALID_CREDENTIALS',
        message: 'bad',
        requestId: 'r',
      }),
    )
    renderModal()
    await user.type(screen.getByLabelText('Email address'), 'x@y.z')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => {
      expect(screen.getByText(/don't match our records/)).toBeInTheDocument()
    })
    await user.click(screen.getByLabelText('Dismiss message'))
    expect(
      screen.queryByText(/don't match our records/),
    ).not.toBeInTheDocument()
  })

  it('formError resets when switching views', async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(401, {
        code: 'INVALID_CREDENTIALS',
        message: 'bad',
        requestId: 'r',
      }),
    )
    renderModal()
    await user.type(screen.getByLabelText('Email address'), 'x@y.z')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => {
      expect(screen.getByText(/don't match our records/)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Create one!' }))
    expect(
      screen.queryByText(/don't match our records/),
    ).not.toBeInTheDocument()
  })

  it('forgot-password still toasts "coming soon"', async () => {
    const user = userEvent.setup()
    const onShowToast = vi.fn()
    render(<AuthModal {...defaultProps} onShowToast={onShowToast} />, {
      wrapper: Wrapper,
    })
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    await user.type(screen.getByLabelText(/Email/i), 'x@y.z')
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    expect(onShowToast).toHaveBeenCalledWith(
      'Password reset is coming soon. Hang tight.',
    )
  })

  it('VALIDATION_FAILED from backend maps field errors inline', async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(400, {
        code: 'VALIDATION_FAILED',
        message: 'bad input',
        requestId: 'r',
        fieldErrors: { email: 'must be a real email' },
      }),
    )
    renderModal()
    await user.type(screen.getByLabelText('Email address'), 'someone@here.com')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    // Inline field error uses backend message verbatim
    await waitFor(() => {
      expect(
        screen.getByText('must be a real email'),
      ).toBeInTheDocument()
    })
    // Form-level copy also shows the generic VALIDATION_FAILED copy
    expect(screen.getByText(/check the fields below/)).toBeInTheDocument()
  })

  it('register submit omits timezone when Intl returns undefined', async () => {
    const user = userEvent.setup()
    const originalIntl = Intl.DateTimeFormat
    const throwingIntl = vi.fn(() => {
      throw new Error('blocked by privacy ext')
    }) as unknown as typeof Intl.DateTimeFormat
    ;(globalThis as { Intl: typeof Intl }).Intl = {
      ...Intl,
      DateTimeFormat: throwingIntl,
    } as typeof Intl

    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { registered: true }, meta: {} }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: { token: 't', user: SAMPLE_USER_SUMMARY },
          meta: {},
        }),
      )

    render(<AuthModal {...defaultProps} initialView="register" />, {
      wrapper: Wrapper,
    })
    await user.type(screen.getByLabelText(/First name/i), 'X')
    await user.type(screen.getByLabelText(/Last name/i), 'Y')
    await user.type(screen.getByLabelText('Email address'), 'x@y.z')
    await user.type(screen.getByLabelText('Password'), 'long-enough-password')
    await user.type(
      screen.getByLabelText(/Confirm password/i),
      'long-enough-password',
    )
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Create Account' }))
    })

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    const registerCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).endsWith('/api/v1/auth/register'),
    )
    const body = JSON.parse(registerCall![1].body as string) as Record<
      string,
      unknown
    >
    expect('timezone' in body).toBe(false)

    ;(globalThis as { Intl: typeof Intl }).Intl = {
      ...Intl,
      DateTimeFormat: originalIntl,
    } as typeof Intl
  })
})
