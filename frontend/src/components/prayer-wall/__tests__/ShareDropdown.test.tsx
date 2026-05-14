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

  // --- Spec 6.7 — "Share as image" gating ---

  it('renders "Share as image" menu item when onShareAsImage is defined', () => {
    render(
      <ShareDropdown
        prayerId="prayer-1"
        prayerContent="Sample"
        isOpen={true}
        onClose={vi.fn()}
        onShareAsImage={vi.fn()}
      />,
    )
    expect(
      screen.getByTestId('share-as-image-menu-item'),
    ).toBeInTheDocument()
  })

  it('does NOT render "Share as image" when onShareAsImage is undefined', () => {
    renderDropdown()
    expect(
      screen.queryByTestId('share-as-image-menu-item'),
    ).not.toBeInTheDocument()
  })

  it('"Share as image" is the FIRST menu item', () => {
    render(
      <ShareDropdown
        prayerId="prayer-1"
        prayerContent="Sample"
        isOpen={true}
        onClose={vi.fn()}
        onShareAsImage={vi.fn()}
      />,
    )
    const items = screen.getAllByRole('menuitem')
    expect(items[0]).toBe(screen.getByTestId('share-as-image-menu-item'))
  })

  it('clicking "Share as image" closes the dropdown and invokes onShareAsImage', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onShareAsImage = vi.fn()
    render(
      <ShareDropdown
        prayerId="prayer-1"
        prayerContent="Sample"
        isOpen={true}
        onClose={onClose}
        onShareAsImage={onShareAsImage}
      />,
    )
    await user.click(screen.getByTestId('share-as-image-menu-item'))
    expect(onClose).toHaveBeenCalled()
    expect(onShareAsImage).toHaveBeenCalled()
  })
})
