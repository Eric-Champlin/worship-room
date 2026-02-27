import { useState, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/hooks/useFocusTrap'

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
}

export function AuthModal({ isOpen, onClose, onShowToast }: AuthModalProps) {
  const [view, setView] = useState<AuthView>('login')
  const [resetEmail, setResetEmail] = useState('')
  const containerRef = useFocusTrap(isOpen, onClose)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  // Reset view and fields when closing
  useEffect(() => {
    if (!isOpen) {
      setView('login')
      setResetEmail('')
    }
  }, [isOpen])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      onShowToast('Authentication coming soon')
      onClose()
    },
    [onClose, onShowToast],
  )

  const handleForgotSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      onShowToast('Password reset coming soon')
      setResetEmail('')
      setView('login')
    },
    [onShowToast],
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex items-center justify-center">
          <h2 id="auth-modal-title" className="text-center font-script text-4xl font-bold text-primary sm:text-5xl">
            {VIEW_TITLES[view]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-light transition-colors hover:text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {view === 'forgot-password' ? (
          <>
            <p className="mt-2 text-center text-sm text-text-light">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleForgotSubmit} className="mt-4">
              <div className="mb-4">
                <label htmlFor="auth-reset-email" className="mb-1 block text-sm font-medium text-text-dark">
                  Email
                </label>
                <input
                  id="auth-reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" disabled={!resetEmail.trim()}>
                Send Reset Link
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-text-light">
              <button
                type="button"
                onClick={() => setView('login')}
                className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
              >
                Back to Log In
              </button>
            </p>
          </>
        ) : (
          <>
            {/* Login / Register form */}
            <form onSubmit={handleSubmit} className="mt-4">
              {view === 'register' && (
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-first-name" className="mb-1 block text-sm font-medium text-text-dark">
                      First name
                    </label>
                    <input
                      id="auth-first-name"
                      type="text"
                      required
                      autoComplete="given-name"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="auth-last-name" className="mb-1 block text-sm font-medium text-text-dark">
                      Last name
                    </label>
                    <input
                      id="auth-last-name"
                      type="text"
                      required
                      autoComplete="family-name"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-text-dark">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-text-dark">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {view === 'register' && (
                <div className="mb-3">
                  <label htmlFor="auth-confirm-password" className="mb-1 block text-sm font-medium text-text-dark">
                    Confirm password
                  </label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              )}

              {view === 'login' && (
                <button
                  type="button"
                  onClick={() => setView('forgot-password')}
                  className="mb-3 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
                >
                  Forgot password?
                </button>
              )}

              <Button type="submit" variant="primary" className="w-full">
                {view === 'login' ? 'Log In' : 'Create Account'}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-text-light">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Spotify button (disabled) */}
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[#1DB954]/40 px-4 py-2.5 text-sm font-medium text-white opacity-60"
              aria-label="Continue with Spotify"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Continue with Spotify
            </button>

            {/* Toggle link */}
            <p className="mt-4 text-center text-sm text-text-light">
              {view === 'login' ? (
                <>
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => setView('register')}
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
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
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
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
