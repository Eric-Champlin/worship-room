import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { EmailPreviewModal } from '../EmailPreviewModal'

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  monthName: 'February',
}

describe('EmailPreviewModal', () => {
  it('renders when open', () => {
    render(<EmailPreviewModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('hidden when closed', () => {
    const { container } = render(
      <EmailPreviewModal {...defaultProps} isOpen={false} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('close button works', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<EmailPreviewModal {...defaultProps} onClose={onClose} />)
    await user.click(screen.getByLabelText('Close email preview'))
    expect(onClose).toHaveBeenCalled()
  })

  it('escape dismisses', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<EmailPreviewModal {...defaultProps} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('subject line contains month', () => {
    render(<EmailPreviewModal {...defaultProps} />)
    expect(
      screen.getByText(/your february faith journey — worship room/i),
    ).toBeInTheDocument()
  })

  it('light theme inside email', () => {
    const { container } = render(<EmailPreviewModal {...defaultProps} />)
    const whiteBox = container.querySelector('.bg-white')
    expect(whiteBox).toBeInTheDocument()
  })

  it('disclaimer present', () => {
    render(<EmailPreviewModal {...defaultProps} />)
    expect(
      screen.getByText(/email reports coming soon/i),
    ).toBeInTheDocument()
  })

  it('CTA button is non-functional', () => {
    render(<EmailPreviewModal {...defaultProps} />)
    const cta = screen.getByText('View Full Report')
    // Should be a div, not a button or anchor
    expect(cta.tagName).toBe('DIV')
  })

  it('has dialog role and aria-modal', () => {
    render(<EmailPreviewModal {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
