import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WatchOptInConfirmModal } from '../WatchOptInConfirmModal'

describe('WatchOptInConfirmModal (Spec 6.4)', () => {
  it('renders alertdialog with correct header and body copy when isOpen=true', () => {
    render(
      <WatchOptInConfirmModal
        isOpen={true}
        onConfirm={() => {}}
        onDecline={() => {}}
      />,
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Turn on 3am Watch?')).toBeInTheDocument()
    expect(
      screen.getByText(/mental-health and crisis-flagged posts/i),
    ).toBeInTheDocument()
  })

  it('renders nothing when isOpen=false', () => {
    render(
      <WatchOptInConfirmModal
        isOpen={false}
        onConfirm={() => {}}
        onDecline={() => {}}
      />,
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('calls onConfirm when "Yes, turn on" is clicked', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <WatchOptInConfirmModal
        isOpen={true}
        onConfirm={onConfirm}
        onDecline={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: /yes, turn on/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onDecline when "Not right now" is clicked', async () => {
    const onDecline = vi.fn()
    const user = userEvent.setup()
    render(
      <WatchOptInConfirmModal
        isOpen={true}
        onConfirm={() => {}}
        onDecline={onDecline}
      />,
    )
    await user.click(screen.getByRole('button', { name: /not right now/i }))
    expect(onDecline).toHaveBeenCalledOnce()
  })

  it('calls onDecline when Esc key is pressed (W33)', async () => {
    const onDecline = vi.fn()
    const user = userEvent.setup()
    render(
      <WatchOptInConfirmModal
        isOpen={true}
        onConfirm={() => {}}
        onDecline={onDecline}
      />,
    )
    await user.keyboard('{Escape}')
    expect(onDecline).toHaveBeenCalled()
  })

  it('moves focus to "Yes, turn on" primary action on open (W32)', async () => {
    render(
      <WatchOptInConfirmModal
        isOpen={true}
        onConfirm={() => {}}
        onDecline={() => {}}
      />,
    )
    // Allow useEffect to run
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByRole('button', { name: /yes, turn on/i })).toHaveFocus()
  })
})
