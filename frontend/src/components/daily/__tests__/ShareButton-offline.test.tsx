import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShareButton } from '../ShareButton'

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}))

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
const mockUseOnlineStatus = vi.mocked(useOnlineStatus)

const defaultProps = {
  shareUrl: '/verse/1',
  shareText: 'Check out this verse',
  shareTitle: 'Worship Room',
}

describe('ShareButton offline handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Ensure Web Share API is not available so fallback dropdown shows
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  it('hides social options when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<ShareButton {...defaultProps} />)

    // Open the dropdown
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    // Copy link should be present
    expect(screen.getByText('Copy link')).toBeInTheDocument()

    // Social options should be hidden
    expect(screen.queryByText('Email')).not.toBeInTheDocument()
    expect(screen.queryByText('Facebook')).not.toBeInTheDocument()
    expect(screen.queryByText('X (Twitter)')).not.toBeInTheDocument()
  })

  it('keeps copy-to-clipboard when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<ShareButton {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(screen.getByText('Copy link')).toBeInTheDocument()
  })

  it('shows social options when online', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true })
    render(<ShareButton {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Facebook')).toBeInTheDocument()
    expect(screen.getByText('X (Twitter)')).toBeInTheDocument()
  })
})
