import { useState, useCallback, useEffect, useRef } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAuth } from '@/hooks/useAuth'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { AuthError, AUTH_ERROR_COPY, type AuthErrorCode } from '@/types/auth'

const PASSWORD_MIN_LENGTH = 8

type AuthView = 'login' | 'register' | 'forgot-password'

const VIEW_TITLES: Record<AuthView, string> = {
  login: 'Log In',
  register: 'Create Account',
  'forgot-password': 'Reset Password',
}

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onShowToast: (message: string) => void
  subtitle?: string
  initialView?: 'login' | 'register'
}

/** Safe browser timezone capture — some privacy-aggressive environments throw or return empty. */
function safeResolveTimezone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz && tz.length > 0 ? tz : undefined
  } catch {
    return undefined
  }
}

export function AuthModal({ isOpen, onClose, onShowToast, subtitle, initialView = 'login' }: AuthModalProps) {
  const [view, setView] = useState<AuthView>(initialView)
  const [resetEmail, setResetEmail] = useState('')
  const [emailValue, setEmailValue] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [firstNameValue, setFirstNameValue] = useState('')
  const [lastNameValue, setLastNameValue] = useState('')
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [firstNameError, setFirstNameError] = useState<string | null>(null)
  const [lastNameError, setLastNameError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [resetEmailError, setResetEmailError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<{ code: AuthErrorCode | 'UNKNOWN'; message: string } | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const reducedMotion = useReducedMotion()
  const { login, register } = useAuth()

  const firstNameRef = useRef<HTMLInputElement>(null)
  const lastNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)
  const formErrorRef = useRef<HTMLDivElement>(null)

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }, [])

  const handleClose = useCallback(() => {
    if (reducedMotion) {
      onClose()
      return
    }
    setIsClosing(true)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 150)
  }, [onClose, reducedMotion])

  const containerRef = useFocusTrap(isOpen, handleClose)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  // Set view from initialView on open; clear fields on close
  useEffect(() => {
    if (isOpen) {
      setView(initialView)
    } else {
      setResetEmail('')
      setFirstNameValue('')
      setLastNameValue('')
      setConfirmPasswordValue('')
      setFirstNameError(null)
      setLastNameError(null)
      setConfirmPasswordError(null)
      setResetEmailError(null)
      setTouched({})
      setSubmitted(false)
      setFormError(null)
      setIsSubmitting(false)
    }
  }, [isOpen, initialView])

  // Reset form-level error when switching between login / register views
  useEffect(() => {
    setFormError(null)
  }, [view])

  type InvalidField = 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword'

  const focusField = useCallback((field: InvalidField) => {
    const refMap: Record<InvalidField, React.RefObject<HTMLInputElement>> = {
      firstName: firstNameRef,
      lastName: lastNameRef,
      email: emailRef,
      password: passwordRef,
      confirmPassword: confirmPasswordRef,
    }
    refMap[field].current?.focus()
  }, [])

  const applyServerFieldErrors = useCallback((fieldErrors: Record<string, string>) => {
    if (fieldErrors.email) setEmailError(fieldErrors.email)
    if (fieldErrors.password) setPasswordError(fieldErrors.password)
    if (fieldErrors.firstName) setFirstNameError(fieldErrors.firstName)
    if (fieldErrors.lastName) setLastNameError(fieldErrors.lastName)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitted(true)
      setFormError(null)

      const invalidFields: InvalidField[] = []

      if (view === 'register') {
        if (!firstNameValue.trim()) {
          setFirstNameError('First name is required')
          invalidFields.push('firstName')
        } else {
          setFirstNameError(null)
        }

        if (!lastNameValue.trim()) {
          setLastNameError('Last name is required')
          invalidFields.push('lastName')
        } else {
          setLastNameError(null)
        }
      }

      if (!emailValue.trim()) {
        setEmailError('Email is required')
        invalidFields.push('email')
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        setEmailError('Please enter a valid email')
        invalidFields.push('email')
      } else {
        setEmailError(null)
      }

      if (!passwordValue) {
        setPasswordError('Password is required')
        invalidFields.push('password')
      } else if (passwordValue.length < PASSWORD_MIN_LENGTH) {
        setPasswordError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
        invalidFields.push('password')
      } else {
        setPasswordError(null)
      }

      if (view === 'register') {
        if (!confirmPasswordValue) {
          setConfirmPasswordError('Confirm password is required')
          invalidFields.push('confirmPassword')
        } else if (confirmPasswordValue !== passwordValue) {
          setConfirmPasswordError('Passwords do not match')
          invalidFields.push('confirmPassword')
        } else {
          setConfirmPasswordError(null)
        }
      }

      if (invalidFields.length > 0) {
        // Visual-order focus: firstName → lastName → email → password → confirmPassword
        const order: InvalidField[] = ['firstName', 'lastName', 'email', 'password', 'confirmPassword']
        const first = order.find((f) => invalidFields.includes(f))
        if (first) {
          requestAnimationFrame(() => focusField(first))
        }
        return
      }

      setIsSubmitting(true)

      try {
        if (view === 'login') {
          await login({ email: emailValue, password: passwordValue })
        } else {
          const timezone = safeResolveTimezone()
          await register({
            email: emailValue,
            password: passwordValue,
            firstName: firstNameValue,
            lastName: lastNameValue,
            timezone,
          })
        }
        handleClose()
      } catch (err) {
        if (err instanceof AuthError) {
          if (err.code === 'VALIDATION_FAILED' && err.fieldErrors) {
            applyServerFieldErrors(err.fieldErrors)
          }
          const copy = AUTH_ERROR_COPY[err.code] ?? AUTH_ERROR_COPY.UNKNOWN
          setFormError({ code: err.code, message: copy })
        } else {
          setFormError({ code: 'UNKNOWN', message: AUTH_ERROR_COPY.UNKNOWN })
        }
        requestAnimationFrame(() => formErrorRef.current?.focus())
      } finally {
        setIsSubmitting(false)
      }
    },
    [emailValue, passwordValue, firstNameValue, lastNameValue, confirmPasswordValue, view, handleClose, login, register, focusField, applyServerFieldErrors],
  )

  const handleForgotSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!resetEmail.trim()) {
        setResetEmailError('Email is required')
        return
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
        setResetEmailError('Please enter a valid email')
        return
      }

      setResetEmailError(null)
      onShowToast('Password reset is coming soon. Hang tight.')
      setResetEmail('')
      setView('login')
    },
    [onShowToast, resetEmail],
  )

  if (!isOpen && !isClosing) return null

  const backdropClass = isClosing
    ? 'motion-safe:animate-backdrop-fade-out'
    : 'motion-safe:animate-backdrop-fade-in'
  const panelClass = isClosing
    ? 'motion-safe:animate-fade-out'
    : 'motion-safe:animate-scale-in'

  const whitePillClass =
    'w-full rounded-full bg-white py-3 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all motion-reduce:transition-none hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${backdropClass}`}
      style={{ background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.12) 0%, transparent 60%), rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby={subtitle && view !== 'forgot-password' ? 'auth-modal-subtitle' : undefined}
        className={`mx-4 w-full max-w-md rounded-3xl bg-hero-bg/95 backdrop-blur-md border border-white/[0.12] p-6 shadow-[0_0_40px_rgba(139,92,246,0.15),0_8px_30px_rgba(0,0,0,0.4)] ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex items-center justify-center">
          <h2 id="auth-modal-title" className="text-center text-3xl font-bold sm:text-4xl pb-1" style={GRADIENT_TEXT_STYLE}>
            {VIEW_TITLES[view]}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex min-h-[44px] min-w-[44px] items-center justify-center text-white/50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {subtitle && view !== 'forgot-password' && (
          <p id="auth-modal-subtitle" className="mt-2 text-center text-sm text-white/90">
            {subtitle}
          </p>
        )}

        {view === 'forgot-password' ? (
          <>
            <p className="mt-2 text-center text-sm text-white/90">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleForgotSubmit} noValidate className="mt-4">
              <div className="mb-4">
                <label htmlFor="auth-reset-email" className="mb-1 block text-sm font-medium text-white">
                  Email<span className="text-purple-400 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> required</span>
                </label>
                <input
                  id="auth-reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => { setResetEmail(e.target.value); setResetEmailError(null) }}
                  aria-invalid={resetEmailError ? 'true' : undefined}
                  aria-describedby={resetEmailError ? 'reset-email-error' : undefined}
                  className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-purple-400/50 focus-visible:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                />
                {resetEmailError && (
                  <p id="reset-email-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {resetEmailError}
                  </p>
                )}
              </div>

              <Button type="submit" className={whitePillClass}>
                Send Reset Link
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-white/90">
              <button
                type="button"
                onClick={() => setView('login')}
                className="font-medium text-purple-400 hover:text-purple-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
              >
                Back to Log In
              </button>
            </p>
          </>
        ) : (
          <>
            {/* Login / Register form */}
            <form onSubmit={handleSubmit} noValidate className="mt-4">
              {view === 'register' && (
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-first-name" className="mb-1 block text-sm font-medium text-white">
                      First name<span className="text-purple-400 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> required</span>
                    </label>
                    <input
                      ref={firstNameRef}
                      id="auth-first-name"
                      type="text"
                      required
                      autoComplete="given-name"
                      value={firstNameValue}
                      onChange={(e) => { setFirstNameValue(e.target.value); setFirstNameError(null) }}
                      onBlur={() => {
                        markTouched('firstName')
                        if (!firstNameValue.trim()) setFirstNameError('First name is required')
                      }}
                      aria-invalid={(touched.firstName || submitted) && firstNameError ? 'true' : undefined}
                      aria-describedby={(touched.firstName || submitted) && firstNameError ? 'firstname-error' : undefined}
                      className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-purple-400/50 focus-visible:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    />
                    {(touched.firstName || submitted) && firstNameError && (
                      <p id="firstname-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {firstNameError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="auth-last-name" className="mb-1 block text-sm font-medium text-white">
                      Last name<span className="text-purple-400 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> required</span>
                    </label>
                    <input
                      ref={lastNameRef}
                      id="auth-last-name"
                      type="text"
                      required
                      autoComplete="family-name"
                      value={lastNameValue}
                      onChange={(e) => { setLastNameValue(e.target.value); setLastNameError(null) }}
                      onBlur={() => {
                        markTouched('lastName')
                        if (!lastNameValue.trim()) setLastNameError('Last name is required')
                      }}
                      aria-invalid={(touched.lastName || submitted) && lastNameError ? 'true' : undefined}
                      aria-describedby={(touched.lastName || submitted) && lastNameError ? 'lastname-error' : undefined}
                      className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-purple-400/50 focus-visible:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    />
                    {(touched.lastName || submitted) && lastNameError && (
                      <p id="lastname-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {lastNameError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-white">
                  Email<span className="text-purple-400 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> required</span>
                </label>
                <input
                  ref={emailRef}
                  id="auth-email"
                  name="auth-email"
                  type="email"
                  required
                  value={emailValue}
                  autoComplete="email"
                  className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-purple-400/50 focus-visible:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                  aria-label="Email address"
                  aria-invalid={emailError ? 'true' : undefined}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  onChange={(e) => { setEmailValue(e.target.value); setEmailError(null) }}
                />
                {emailError && (
                  <p id="email-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {emailError}
                  </p>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-white">
                  Password<span className="text-purple-400 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> required</span>
                </label>
                <input
                  ref={passwordRef}
                  id="auth-password"
                  name="auth-password"
                  type="password"
                  required
                  value={passwordValue}
                  autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-purple-400/50 focus-visible:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                  aria-label="Password"
                  aria-invalid={passwordError ? 'true' : undefined}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  onChange={(e) => { setPasswordValue(e.target.value); setPasswordError(null) }}
                />
                {passwordError && (
                  <p id="password-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {passwordError}
                  </p>
                )}
              </div>

              {view === 'register' && (
                <div className="mb-3">
                  <label htmlFor="auth-confirm-password" className="mb-1 block text-sm font-medium text-white">
                    Confirm password<span className="text-purple-400 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> required</span>
                  </label>
                  <input
                    ref={confirmPasswordRef}
                    id="auth-confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPasswordValue}
                    onChange={(e) => {
                      setConfirmPasswordValue(e.target.value)
                      if (e.target.value && e.target.value !== passwordValue) {
                        setConfirmPasswordError('Passwords do not match')
                      } else {
                        setConfirmPasswordError(null)
                      }
                    }}
                    onBlur={() => {
                      markTouched('confirmPassword')
                      if (!confirmPasswordValue) {
                        setConfirmPasswordError('Confirm password is required')
                      } else if (confirmPasswordValue !== passwordValue) {
                        setConfirmPasswordError('Passwords do not match')
                      }
                    }}
                    aria-invalid={(touched.confirmPassword || submitted) && confirmPasswordError ? 'true' : undefined}
                    aria-describedby={(touched.confirmPassword || submitted) && confirmPasswordError ? 'confirmpassword-error' : undefined}
                    className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-purple-400/50 focus-visible:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                  />
                  {(touched.confirmPassword || submitted) && confirmPasswordError && (
                    <p id="confirmpassword-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {confirmPasswordError}
                    </p>
                  )}
                </div>
              )}

              {view === 'login' && (
                <button
                  type="button"
                  onClick={() => setView('forgot-password')}
                  className="mb-3 text-sm text-purple-400 hover:text-purple-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
                >
                  Forgot password?
                </button>
              )}

              {formError && (
                <div ref={formErrorRef} tabIndex={-1} className="mb-3 focus:outline-none">
                  <FormError severity="error" onDismiss={() => setFormError(null)}>
                    {formError.message}
                  </FormError>
                </div>
              )}

              <Button type="submit" isLoading={isSubmitting} className={whitePillClass}>
                {view === 'login' ? 'Log In' : 'Create Account'}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 border-t border-white/[0.08]" />
              <span className="text-xs text-white/30">or</span>
              <div className="h-px flex-1 border-t border-white/[0.08]" />
            </div>

            {/* Spotify button (disabled) */}
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-transparent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.04] hover:border-white/[0.18]"
              aria-label="Continue with Spotify"
            >
              <svg className="h-5 w-5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Continue with Spotify
            </button>

            {/* Toggle link */}
            <p className="mt-4 text-center text-sm text-white/90">
              {view === 'login' ? (
                <>
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => setView('register')}
                    className="font-medium text-purple-400 hover:text-purple-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
                  >
                    Create one!
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="font-medium text-purple-400 hover:text-purple-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
