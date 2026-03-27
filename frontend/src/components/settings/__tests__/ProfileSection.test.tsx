import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { ProfileSection } from '../ProfileSection'
import { DEFAULT_SETTINGS } from '@/services/settings-storage'

const defaultProfile = { ...DEFAULT_SETTINGS.profile, displayName: 'Eric' }

function renderProfile(props: Partial<Parameters<typeof ProfileSection>[0]> = {}) {
  const onUpdateProfile = vi.fn()
  const result = render(
    <AuthProvider>
      <ToastProvider>
        <ProfileSection
          profile={props.profile ?? defaultProfile}
          userName={props.userName ?? 'Eric'}
          onUpdateProfile={props.onUpdateProfile ?? onUpdateProfile}
        />
      </ToastProvider>
    </AuthProvider>,
  )
  return { ...result, onUpdateProfile: props.onUpdateProfile ?? onUpdateProfile }
}

describe('ProfileSection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // --- Display Name ---

  it('display name pre-filled from settings', () => {
    renderProfile()
    const input = screen.getByLabelText('Display Name') as HTMLInputElement
    expect(input.value).toBe('Eric')
  })

  it('character count updates live', async () => {
    const user = userEvent.setup()
    renderProfile({ profile: { ...defaultProfile, displayName: '' }, userName: '' })
    const input = screen.getByLabelText('Display Name')
    await user.type(input, 'Hi')
    expect(screen.getByText('2/30')).toBeInTheDocument()
  })

  it('valid name saves on blur', async () => {
    const user = userEvent.setup()
    const onUpdateProfile = vi.fn()
    renderProfile({ onUpdateProfile })
    const input = screen.getByLabelText('Display Name')
    await user.clear(input)
    await user.type(input, 'NewName')
    await user.tab() // blur
    expect(onUpdateProfile).toHaveBeenCalledWith({ displayName: 'NewName' })
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(localStorage.getItem('wr_user_name')).toBe('NewName')
  })

  it('invalid name (too short) shows error', async () => {
    const user = userEvent.setup()
    const onUpdateProfile = vi.fn()
    renderProfile({ onUpdateProfile })
    const input = screen.getByLabelText('Display Name')
    await user.clear(input)
    await user.type(input, 'A')
    await user.tab()
    expect(screen.getByText(/Name must be between 2 and 30 characters/)).toBeInTheDocument()
    expect(onUpdateProfile).not.toHaveBeenCalled()
  })

  it('empty name reverts to previous', async () => {
    const user = userEvent.setup()
    const onUpdateProfile = vi.fn()
    renderProfile({ onUpdateProfile })
    const input = screen.getByLabelText('Display Name') as HTMLInputElement
    await user.clear(input)
    await user.tab()
    expect(input.value).toBe('Eric')
    expect(onUpdateProfile).not.toHaveBeenCalled()
  })

  it('special characters rejected', async () => {
    const user = userEvent.setup()
    const onUpdateProfile = vi.fn()
    renderProfile({ onUpdateProfile })
    const input = screen.getByLabelText('Display Name')
    await user.clear(input)
    await user.type(input, 'Name@#')
    await user.tab()
    expect(screen.getByText(/Name must be between 2 and 30 characters/)).toBeInTheDocument()
    expect(onUpdateProfile).not.toHaveBeenCalled()
  })

  it('wr_user_name synced on save', async () => {
    const user = userEvent.setup()
    renderProfile()
    const input = screen.getByLabelText('Display Name')
    await user.clear(input)
    await user.type(input, 'Synced')
    await user.tab()
    expect(localStorage.getItem('wr_user_name')).toBe('Synced')
  })

  // --- Avatar ---

  it('avatar renders ProfileAvatar component', () => {
    renderProfile()
    // ProfileAvatar renders the preset avatar (default is 'default' which maps to nature-dove)
    const avatarContainer = screen.getByRole('button', { name: 'Change avatar' }).parentElement
    expect(avatarContainer).toBeInTheDocument()
  })

  it('avatar Change button opens avatar picker modal', async () => {
    const user = userEvent.setup()
    renderProfile()
    await user.click(screen.getByRole('button', { name: 'Change avatar' }))
    expect(screen.getByText('Choose Your Avatar')).toBeInTheDocument()
  })

  // --- Bio ---

  it('bio saves on blur', async () => {
    const user = userEvent.setup()
    const onUpdateProfile = vi.fn()
    renderProfile({ onUpdateProfile })
    const textarea = screen.getByLabelText('Bio')
    await user.type(textarea, 'Hello world')
    await user.tab()
    expect(onUpdateProfile).toHaveBeenCalledWith({ bio: 'Hello world' })
  })

  it('bio character count at 160 limit', () => {
    const longText = 'a'.repeat(160)
    renderProfile({ profile: { ...defaultProfile, bio: longText } })
    expect(screen.getByText('160 / 160')).toBeInTheDocument()
  })

  it('saved indicator fades after 2s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderProfile()
    const input = screen.getByLabelText('Display Name')
    await user.clear(input)
    await user.type(input, 'Valid Name')
    await user.tab()
    expect(screen.getByText('Saved')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(2100)
    })

    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('name input has aria-invalid on error', async () => {
    const user = userEvent.setup()
    renderProfile()
    const input = screen.getByLabelText('Display name')
    await user.clear(input)
    await user.type(input, 'X')
    await user.tab()
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('name error text matches spec', async () => {
    const user = userEvent.setup()
    renderProfile()
    const input = screen.getByLabelText('Display name')
    await user.clear(input)
    await user.type(input, 'X')
    await user.tab()
    expect(screen.getByText(/Name must be between 2 and 30 characters/)).toBeInTheDocument()
  })

  it('name aria-describedby on error', async () => {
    const user = userEvent.setup()
    renderProfile()
    const input = screen.getByLabelText('Display name')
    await user.clear(input)
    await user.type(input, 'X')
    await user.tab()
    expect(input.getAttribute('aria-describedby')).toContain('name-error')
  })

  it('bio textarea has aria-label', () => {
    renderProfile()
    expect(screen.getByLabelText('Bio')).toBeInTheDocument()
  })

  it('bio char count renders', async () => {
    const user = userEvent.setup()
    renderProfile()
    const textarea = screen.getByLabelText('Bio')
    await user.type(textarea, 'Hello world')
    expect(screen.getByText('11 / 160')).toBeInTheDocument()
  })
})
