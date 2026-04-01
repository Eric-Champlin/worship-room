import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui/Toast'
import { InviteSection } from '../InviteSection'

function renderInvite() {
  return render(
    <ToastProvider>
      <InviteSection />
    </ToastProvider>,
  )
}

describe('InviteSection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders both invite cards', () => {
    renderInvite()
    expect(screen.getByText('Invite by Link')).toBeInTheDocument()
    expect(screen.getByText('Invite by Email')).toBeInTheDocument()
  })

  it('copy link button exists and invite link is shown', () => {
    renderInvite()
    expect(screen.getByRole('button', { name: 'Copy Link' })).toBeInTheDocument()
    const linkInput = screen.getByLabelText('Invite link')
    expect((linkInput as HTMLInputElement).value).toContain('/invite/')
  })

  it('email validation rejects invalid email', () => {
    renderInvite()
    const sendBtn = screen.getByRole('button', { name: 'Send Invite' })
    expect(sendBtn).toBeDisabled()
  })

  it('send invite shows toast and clears input', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderInvite()

    const emailInput = screen.getByLabelText("Friend's email address")
    await user.type(emailInput, 'test@example.com')

    const sendBtn = screen.getByRole('button', { name: 'Send Invite' })
    expect(sendBtn).not.toBeDisabled()

    await user.click(sendBtn)

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText('Invitation sent.')).toBeInTheDocument()
    expect(emailInput).toHaveValue('')
  })

  it('has invite-section id for scroll targeting', () => {
    renderInvite()
    expect(document.getElementById('invite-section')).toBeInTheDocument()
  })

  it('send button disabled during sending', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderInvite()

    const emailInput = screen.getByLabelText("Friend's email address")
    await user.type(emailInput, 'test@example.com')

    await user.click(screen.getByRole('button', { name: 'Send Invite' }))
    // During the 300ms delay, button should show "Sending..."
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled()

    await act(async () => {
      vi.advanceTimersByTime(300)
    })
  })
})
