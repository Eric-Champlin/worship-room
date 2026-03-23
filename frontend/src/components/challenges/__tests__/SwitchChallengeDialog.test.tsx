import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SwitchChallengeDialog } from '../SwitchChallengeDialog'

const defaultProps = {
  isOpen: true,
  currentChallengeName: 'Pray40: A Lenten Journey',
  currentDay: 5,
  newChallengeTitle: 'Easter Joy',
  themeColor: '#FDE68A',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
}

describe('SwitchChallengeDialog', () => {
  it('renders title and body when open', () => {
    render(<SwitchChallengeDialog {...defaultProps} />)

    expect(screen.getByText('Switch Challenges?')).toBeInTheDocument()
    expect(
      screen.getByText(/You're on Day 5 of Pray40: A Lenten Journey/),
    ).toBeInTheDocument()
    expect(screen.getByText(/You can resume it later/)).toBeInTheDocument()
  })

  it('renders both buttons', () => {
    render(<SwitchChallengeDialog {...defaultProps} />)

    expect(screen.getByText('Join Easter Joy')).toBeInTheDocument()
    expect(screen.getByText('Keep current challenge')).toBeInTheDocument()
  })

  it('calls onConfirm when primary button clicked', () => {
    const onConfirm = vi.fn()
    render(<SwitchChallengeDialog {...defaultProps} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByText('Join Easter Joy'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when secondary button clicked', () => {
    const onCancel = vi.fn()
    render(<SwitchChallengeDialog {...defaultProps} onCancel={onCancel} />)

    fireEvent.click(screen.getByText('Keep current challenge'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn()
    render(<SwitchChallengeDialog {...defaultProps} onCancel={onCancel} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when clicking backdrop', () => {
    const onCancel = vi.fn()
    render(<SwitchChallengeDialog {...defaultProps} onCancel={onCancel} />)

    // The backdrop is the element with the onClick handler that checks e.target === e.currentTarget
    // It's the parent of the dialog content div
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('does not render when isOpen is false', () => {
    render(<SwitchChallengeDialog {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Switch Challenges?')).not.toBeInTheDocument()
  })

  it('has role="dialog" and aria-modal', () => {
    render(<SwitchChallengeDialog {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
