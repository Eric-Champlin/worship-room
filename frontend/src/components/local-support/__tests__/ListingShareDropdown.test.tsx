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
})
