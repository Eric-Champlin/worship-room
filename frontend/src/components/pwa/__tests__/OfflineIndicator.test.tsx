import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OfflineIndicator } from '../OfflineIndicator'

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}))

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
const mockUseOnlineStatus = vi.mocked(useOnlineStatus)

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when online', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true })
    render(<OfflineIndicator />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders offline pill when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<OfflineIndicator />)
    expect(screen.getByText('Offline')).toBeVisible()
  })

  it('contains WifiOff icon', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<OfflineIndicator />)
    const pill = screen.getByRole('status')
    const svg = pill.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<OfflineIndicator />)
    const pill = screen.getByRole('status')
    expect(pill).toHaveAttribute('aria-live', 'polite')
  })

  it('disappears when connection restores', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    const { rerender } = render(<OfflineIndicator />)
    expect(screen.getByRole('status')).toBeInTheDocument()

    mockUseOnlineStatus.mockReturnValue({ isOnline: true })
    rerender(<OfflineIndicator />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
