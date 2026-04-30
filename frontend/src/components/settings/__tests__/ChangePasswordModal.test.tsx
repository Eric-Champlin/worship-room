import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChangePasswordModal } from '../ChangePasswordModal'
import { ApiError } from '@/types/auth'

const mockChangePasswordApi = vi.fn()

vi.mock('@/services/api/auth-api', () => ({
  changePasswordApi: (current: string, next: string) =>
    mockChangePasswordApi(current, next),
}))

function renderModal(props?: Partial<React.ComponentProps<typeof ChangePasswordModal>>) {
  return render(
    <ChangePasswordModal
      isOpen
      onClose={props?.onClose ?? vi.fn()}
      onSuccess={props?.onSuccess ?? vi.fn()}
    />,
  )
}

describe('ChangePasswordModal', () => {
  beforeEach(() => {
    mockChangePasswordApi.mockReset()
  })

  it('renders three password fields and submit + cancel buttons', () => {
    renderModal()
    expect(screen.getByLabelText('Current password')).toBeInTheDocument()
    expect(screen.getByLabelText('New password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update password' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('confirm password mismatch shows inline error and disables submit', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByLabelText('Current password'), 'anything')
    await user.type(screen.getByLabelText('New password'), 'newpass1234')
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass5678')

    const mismatchError = await screen.findByText("Passwords don't match.")
    expect(mismatchError).toHaveAttribute('role', 'alert')
    const submit = screen.getByRole('button', { name: 'Update password' })
    expect(submit).toBeDisabled()
  })

  it('submit calls changePasswordApi with current and new', async () => {
    const user = userEvent.setup()
    mockChangePasswordApi.mockResolvedValueOnce(undefined)
    renderModal()
    await user.type(screen.getByLabelText('Current password'), 'current-password')
    await user.type(screen.getByLabelText('New password'), 'new-password-9876')
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password-9876')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(mockChangePasswordApi).toHaveBeenCalledTimes(1)
    expect(mockChangePasswordApi).toHaveBeenCalledWith('current-password', 'new-password-9876')
  })

  it('successful API call invokes onSuccess prop', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockChangePasswordApi.mockResolvedValueOnce(undefined)
    renderModal({ onSuccess })

    await user.type(screen.getByLabelText('Current password'), 'current-password')
    await user.type(screen.getByLabelText('New password'), 'new-password-9876')
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password-9876')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('403 CURRENT_PASSWORD_INCORRECT shows inline error on current field', async () => {
    // 403 (not 401) by design — see AuthException#currentPasswordIncorrect javadoc.
    // 401 would trigger apiFetch's global token-clear and force-logout.
    const user = userEvent.setup()
    mockChangePasswordApi.mockRejectedValueOnce(
      new ApiError('CURRENT_PASSWORD_INCORRECT', 403, 'wrong', null),
    )
    renderModal()

    await user.type(screen.getByLabelText('Current password'), 'whatever-current')
    await user.type(screen.getByLabelText('New password'), 'new-password-9876')
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password-9876')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    const inlineError = await screen.findByText("Your current password isn't correct.")
    expect(inlineError).toHaveAttribute('role', 'alert')
    expect(screen.getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true')
  })
})
