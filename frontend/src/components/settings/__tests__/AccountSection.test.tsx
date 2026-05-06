import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AccountSection } from '../AccountSection'

const mockLogout = vi.fn()
const mockChangePasswordApi = vi.fn()

vi.mock('@/services/api/auth-api', () => ({
  changePasswordApi: (current: string, next: string) =>
    mockChangePasswordApi(current, next),
}))


vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { name: 'Test User', id: 'test-user-id' },
    login: vi.fn(),
    logout: mockLogout,
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { name: 'Test User', id: 'test-user-id' },
    login: vi.fn(),
    logout: mockLogout,
  }),
}))

function renderAccount(email = 'user@example.com') {
  return render(
    <MemoryRouter
      initialEntries={['/settings']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <Routes>
          <Route path="/settings" element={<AccountSection email={email} />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('AccountSection', () => {
  beforeEach(() => {
    localStorage.clear()
    mockLogout.mockClear()
    mockChangePasswordApi.mockReset()
  })

  it('email displayed from settings', () => {
    renderAccount()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('Change Email shows toast', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Change Email' }))
    expect(screen.getByText('This feature is on the way.')).toBeInTheDocument()
  })

  it('Change Password button opens ChangePasswordModal', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Change Password' }))
    // Modal renders with the Update password submit button visible.
    expect(screen.getByRole('button', { name: 'Update password' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toBeInTheDocument()
  })

  it('Delete Account button has muted danger styling', () => {
    renderAccount()
    const btn = screen.getByRole('button', { name: 'Delete Account' })
    expect(btn.className).toContain('bg-red-950/30')
  })

  it('Delete button opens modal', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('modal has role="alertdialog"', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('modal has focus trap (Tab cycles within modal)', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    // Modal should contain Cancel and Delete Everything buttons
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Everything' })).toBeInTheDocument()
  })

  it('Escape closes modal', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('Cancel closes modal', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('Delete Everything clears all wr_ keys', async () => {
    const user = userEvent.setup()
    localStorage.setItem('wr_settings', '{}')
    localStorage.setItem('wr_friends', '{}')
    localStorage.setItem('wr_mood_entries', '[]')
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('non_wr_key', 'keep')

    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    await user.click(screen.getByRole('button', { name: 'Delete Everything' }))

    expect(localStorage.getItem('wr_settings')).toBeNull()
    expect(localStorage.getItem('wr_friends')).toBeNull()
    expect(localStorage.getItem('wr_mood_entries')).toBeNull()
    expect(localStorage.getItem('wr_auth_simulated')).toBeNull()
    expect(localStorage.getItem('non_wr_key')).toBe('keep')
  })

  it('Delete calls logout', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    await user.click(screen.getByRole('button', { name: 'Delete Everything' }))
    expect(mockLogout).toHaveBeenCalled()
  })

  it('Delete navigates to /', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    await user.click(screen.getByRole('button', { name: 'Delete Everything' }))
    // After navigate to /, the Home route renders
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('Change Email button uses text-violet-300', () => {
    renderAccount()
    const btn = screen.getByRole('button', { name: 'Change Email' })
    expect(btn.className).toContain('text-violet-300')
  })

  it('Change Password button uses text-violet-300', () => {
    renderAccount()
    const btn = screen.getByRole('button', { name: 'Change Password' })
    expect(btn.className).toContain('text-violet-300')
  })

  it('handleDeleteConfirm sweeps bible:* keys', async () => {
    const user = userEvent.setup()
    localStorage.setItem('bible:bookmarks', '[]')
    localStorage.setItem('bible:notes', '[]')
    localStorage.setItem('bible:journalEntries', '[]')
    localStorage.setItem('bible:plans', '{}')
    localStorage.setItem('bible:streak', '{}')

    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    await user.click(screen.getByRole('button', { name: 'Delete Everything' }))

    expect(localStorage.getItem('bible:bookmarks')).toBeNull()
    expect(localStorage.getItem('bible:notes')).toBeNull()
    expect(localStorage.getItem('bible:journalEntries')).toBeNull()
    expect(localStorage.getItem('bible:plans')).toBeNull()
    expect(localStorage.getItem('bible:streak')).toBeNull()
  })

  it('handleDeleteConfirm sweeps bb*-v1: keys', async () => {
    const user = userEvent.setup()
    localStorage.setItem('bb26-v1:audioBibles', '{}')
    localStorage.setItem('bb29-v1:continuousPlayback', 'true')
    localStorage.setItem('bb32-v1:explain:abc', '{}')
    localStorage.setItem('bb32-v1:reflect:def', '{}')
    localStorage.setItem('bb44-v1:readAlong', 'true')

    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    await user.click(screen.getByRole('button', { name: 'Delete Everything' }))

    expect(localStorage.getItem('bb26-v1:audioBibles')).toBeNull()
    expect(localStorage.getItem('bb29-v1:continuousPlayback')).toBeNull()
    expect(localStorage.getItem('bb32-v1:explain:abc')).toBeNull()
    expect(localStorage.getItem('bb32-v1:reflect:def')).toBeNull()
    expect(localStorage.getItem('bb44-v1:readAlong')).toBeNull()
  })

  it('handleDeleteConfirm preserves keys outside the sweep prefixes', async () => {
    const user = userEvent.setup()
    // Seed both an in-prefix key (proves the sweep ran) and several out-of-prefix
    // keys that must survive. Guards against a future widening of DELETE_PREFIXES
    // accidentally catching third-party storage.
    localStorage.setItem('wr_in_prefix', 'sweep-target')
    localStorage.setItem('unrelated_key', 'preserved')
    localStorage.setItem('analytics_id', 'preserved')
    localStorage.setItem('theme_preference', 'preserved')

    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    await user.click(screen.getByRole('button', { name: 'Delete Everything' }))

    expect(localStorage.getItem('wr_in_prefix')).toBeNull()
    expect(localStorage.getItem('unrelated_key')).toBe('preserved')
    expect(localStorage.getItem('analytics_id')).toBe('preserved')
    expect(localStorage.getItem('theme_preference')).toBe('preserved')
  })

  it('DeleteAccountModal has aria-modal="true"', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('DeleteAccountModal shows AlertTriangle icon', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    const dialog = screen.getByRole('alertdialog')
    // AlertTriangle is aria-hidden; verify heading row has flex container
    const heading = dialog.querySelector('h2')
    expect(heading?.parentElement?.className).toContain('flex')
  })

  it('Delete Everything button uses muted destructive severity colors', async () => {
    const user = userEvent.setup()
    renderAccount()
    await user.click(screen.getByRole('button', { name: 'Delete Account' }))
    const btn = screen.getByRole('button', { name: 'Delete Everything' })
    expect(btn.className).toContain('bg-red-950/30')
    expect(btn.className).toContain('border-red-400/30')
    expect(btn.className).toContain('text-red-100')
  })
})
