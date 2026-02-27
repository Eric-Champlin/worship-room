import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareDropdown } from '../ShareDropdown'

function renderDropdown(overrides?: { isOpen?: boolean; prayerContent?: string }) {
  return render(
    <ShareDropdown
      prayerId="prayer-1"
      prayerContent={overrides?.prayerContent ?? 'Please pray for my family.'}
      isOpen={overrides?.isOpen ?? true}
      onClose={vi.fn()}
    />,
  )
}

describe('ShareDropdown', () => {
  it('renders share options when open', () => {
    renderDropdown({ isOpen: true })
    expect(screen.getByText('Copy link')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Facebook')).toBeInTheDocument()
    expect(screen.getByText('X (Twitter)')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderDropdown({ isOpen: false })
    expect(screen.queryByText('Copy link')).not.toBeInTheDocument()
  })

  it('copy link button is rendered and clickable', async () => {
    const user = userEvent.setup()
    renderDropdown()
    const copyBtn = screen.getByText('Copy link')
    expect(copyBtn).toBeInTheDocument()
    // Click should not throw even without clipboard API
    await user.click(copyBtn)
  })

  it('email option has correct mailto link', () => {
    renderDropdown()
    const emailLink = screen.getByText('Email').closest('a')
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('mailto:'))
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('Prayer%20Request'))
  })
})
