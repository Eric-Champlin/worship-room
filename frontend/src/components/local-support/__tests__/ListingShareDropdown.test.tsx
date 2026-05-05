import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListingShareDropdown } from '../ListingShareDropdown'

const defaultProps = {
  placeId: 'church-1',
  placeName: 'First Baptist Church',
  category: 'churches' as const,
  isOpen: true,
  onClose: vi.fn(),
}

describe('ListingShareDropdown', () => {
  it('renders all share options', () => {
    render(<ListingShareDropdown {...defaultProps} />)
    expect(screen.getByText('Copy link')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Facebook')).toBeInTheDocument()
    expect(screen.getByText('X (Twitter)')).toBeInTheDocument()
  })

  it('copy link writes to clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    render(<ListingShareDropdown {...defaultProps} />)
    await user.click(screen.getByText('Copy link'))
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/local-support/churches?placeId=church-1'),
    )
  })

  it('escape closes dropdown', () => {
    const onClose = vi.fn()
    render(<ListingShareDropdown {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('does not render when isOpen is false', () => {
    render(<ListingShareDropdown {...defaultProps} isOpen={false} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  // Spec 5 Step 9 — light → dark theme migration

  it('panel uses dark theme (bg-hero-mid/95 + border-white/10 + shadow-frosted-base)', () => {
    render(<ListingShareDropdown {...defaultProps} />)
    const panel = screen.getByRole('menu', { name: /share options/i })
    expect(panel.className).toContain('bg-hero-mid/95')
    expect(panel.className).toContain('backdrop-blur-md')
    expect(panel.className).toContain('border-white/10')
    expect(panel.className).toContain('shadow-frosted-base')
    expect(panel.className).toContain('rounded-xl')
    expect(panel.className).toContain('w-56')
    // Light-theme tokens are gone
    expect(panel.className).not.toContain('bg-white ')
    expect(panel.className).not.toContain('border-gray-200')
    expect(panel.className).not.toContain('shadow-lg')
  })

  it('item rows use text-white/80 (no light-theme text-text-dark)', () => {
    render(<ListingShareDropdown {...defaultProps} />)
    const copyButton = screen.getByText('Copy link').closest('button')
    expect(copyButton?.className).toContain('text-white/80')
    expect(copyButton?.className).toContain('hover:text-white')
    expect(copyButton?.className).toContain('hover:bg-white/[0.05]')
    expect(copyButton?.className).not.toContain('text-text-dark')
    expect(copyButton?.className).not.toContain('hover:bg-gray-50')
  })

  it('Copy icon (default) uses text-white/60', () => {
    render(<ListingShareDropdown {...defaultProps} />)
    const copyButton = screen.getByText('Copy link').closest('button')
    const icon = copyButton?.querySelector('svg')
    expect(icon?.getAttribute('class')).toContain('text-white/60')
  })

  it('Mail icon uses text-white/60', () => {
    render(<ListingShareDropdown {...defaultProps} />)
    const mailLink = screen.getByText('Email').closest('a')
    const icon = mailLink?.querySelector('svg')
    expect(icon?.getAttribute('class')).toContain('text-white/60')
  })

  it('Check icon (after copy success) uses text-emerald-300 not text-success', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })
    render(<ListingShareDropdown {...defaultProps} />)
    await user.click(screen.getByText('Copy link'))
    // After copy, the button label switches to "Copied!" and the icon is Check
    const copiedButton = screen.getByText('Copied!').closest('button')
    const icon = copiedButton?.querySelector('svg')
    expect(icon?.getAttribute('class')).toContain('text-emerald-300')
    expect(icon?.getAttribute('class')).not.toContain('text-success')
  })
})
