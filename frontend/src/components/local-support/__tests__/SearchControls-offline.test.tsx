import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SearchControls } from '../SearchControls'

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}))

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
const mockUseOnlineStatus = vi.mocked(useOnlineStatus)

const defaultProps = {
  onSearch: vi.fn(),
  onGeocode: vi.fn(),
  isLoading: false,
}

describe('SearchControls offline handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows offline message when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<SearchControls {...defaultProps} />)
    expect(
      screen.getByText('Search requires an internet connection')
    ).toBeInTheDocument()
  })

  it('hides search controls when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<SearchControls {...defaultProps} />)
    expect(screen.queryByLabelText('Use my current location')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('City or zip code')).not.toBeInTheDocument()
  })

  it('shows search controls when online', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true })
    render(<SearchControls {...defaultProps} />)
    expect(screen.getByLabelText('Use my current location')).toBeInTheDocument()
    expect(screen.getByLabelText('City or zip code')).toBeInTheDocument()
  })
})
