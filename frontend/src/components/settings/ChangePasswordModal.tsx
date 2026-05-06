import { useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { changePasswordApi } from '@/services/api/auth-api'
import { ApiError } from '@/types/auth'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const containerRef = useFocusTrap(isOpen, onClose)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPasswordTouched, setNewPasswordTouched] = useState(false)
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  if (!isOpen) return null

  const newTooShort = newPasswordTouched && newPassword.length > 0 && newPassword.length < 8
  const confirmMismatch = confirmPasswordTouched && confirmPassword.length > 0 && newPassword !== confirmPassword
  const formValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword

  const showNewPasswordHint = newPassword.length === 0 || !newPasswordTouched

  function resetAndClose() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setNewPasswordTouched(false)
    setConfirmPasswordTouched(false)
    setCurrentError(null)
    setGeneralError(null)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formValid || submitting) return
    setSubmitting(true)
    setCurrentError(null)
    setGeneralError(null)
    try {
      await changePasswordApi(currentPassword, newPassword)
      onSuccess()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'CURRENT_PASSWORD_INCORRECT') {
          setCurrentError("Your current password isn't correct.")
        } else if (err.code === 'PASSWORDS_MUST_DIFFER') {
          setGeneralError('Your new password must differ from your current password.')
        } else if (err.code === 'CHANGE_PASSWORD_RATE_LIMITED') {
          setGeneralError('Too many attempts. Please wait a few minutes and try again.')
        } else {
          setGeneralError('Something went wrong. Please try again.')
        }
      } else {
        setGeneralError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={resetAndClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="relative z-10 rounded-2xl border border-white/10 bg-surface-dark backdrop-blur-md p-6 max-w-md w-full mx-4"
      >
        <h2 id="change-password-title" className="text-lg font-semibold text-white mb-4">
          Change Password
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="cp-current" className="block text-sm font-medium text-white/80 mb-1">
                Current password
              </label>
              <input
                id="cp-current"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setCurrentError(null) }}
                aria-invalid={currentError !== null}
                aria-describedby={currentError ? 'cp-current-error' : undefined}
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {currentError && (
                <p id="cp-current-error" role="alert" className="mt-1 text-sm text-red-100">
                  {currentError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="cp-new" className="block text-sm font-medium text-white/80 mb-1">
                New password
              </label>
              <input
                id="cp-new"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onBlur={() => setNewPasswordTouched(true)}
                aria-invalid={newTooShort}
                aria-describedby={newTooShort ? 'cp-new-error' : showNewPasswordHint ? 'cp-new-hint' : undefined}
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {newTooShort ? (
                <p id="cp-new-error" role="alert" className="mt-1 text-sm text-red-100">
                  Use at least 8 characters.
                </p>
              ) : showNewPasswordHint ? (
                <p id="cp-new-hint" className="mt-1 text-xs text-white/60">
                  Use at least 8 characters.
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="cp-confirm" className="block text-sm font-medium text-white/80 mb-1">
                Confirm new password
              </label>
              <input
                id="cp-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setConfirmPasswordTouched(true)}
                aria-invalid={confirmMismatch}
                aria-describedby={confirmMismatch ? 'cp-confirm-error' : undefined}
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {confirmMismatch && (
                <p id="cp-confirm-error" role="alert" className="mt-1 text-sm text-red-100">
                  Passwords don&apos;t match.
                </p>
              )}
            </div>

            {generalError && (
              <p role="alert" className="text-sm text-red-100">
                {generalError}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={resetAndClose}
              disabled={submitting}
              className="flex-1 bg-white/10 text-white border border-white/15 rounded-lg px-4 py-3 hover:bg-white/15 transition-colors min-h-[44px] text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formValid || submitting}
              className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
            >
              {submitting ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
