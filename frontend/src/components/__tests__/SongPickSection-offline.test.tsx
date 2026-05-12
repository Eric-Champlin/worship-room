import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SongPickSection } from '../SongPickSection'

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}))

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
const mockUseOnlineStatus = vi.mocked(useOnlineStatus)

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <SongPickSection />
    </MemoryRouter>
  )
}

describe('SongPickSection offline handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows offline message when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    renderWithRouter()
    expect(
      screen.getByText('Spotify playlists available when online')
    ).toBeInTheDocument()
  })

  it('keeps heading when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    renderWithRouter()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Song Pick')
    expect(heading).toHaveTextContent('of the Day')
  })

  it('shows iframe when online', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true })
    renderWithRouter()
    // Should have an iframe element
    const iframe = document.querySelector('iframe')
    expect(iframe).toBeInTheDocument()
    expect(iframe?.getAttribute('height')).toBe('352')
    expect(
      screen.queryByText('Spotify playlists available when online')
    ).not.toBeInTheDocument()
  })
})
