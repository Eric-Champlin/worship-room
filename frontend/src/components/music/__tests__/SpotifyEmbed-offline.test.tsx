import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpotifyEmbed } from '../SpotifyEmbed'
import type { SpotifyPlaylist } from '@/data/music/playlists'

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}))

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
const mockUseOnlineStatus = vi.mocked(useOnlineStatus)

const mockPlaylist: SpotifyPlaylist = {
  id: 'test-1',
  name: 'Test Playlist',
  spotifyId: 'abc123',
  spotifyUrl: 'https://open.spotify.com/playlist/abc123',
  section: 'worship',
  displaySize: 'standard',
}

describe('SpotifyEmbed offline handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows offline message when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<SpotifyEmbed playlist={mockPlaylist} />)
    expect(
      screen.getByText('Spotify playlists available when online')
    ).toBeInTheDocument()
    expect(screen.queryByTitle(/Spotify playlist/)).not.toBeInTheDocument()
  })

  it('shows iframe when online', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true })
    render(<SpotifyEmbed playlist={mockPlaylist} />)
    expect(
      screen.getByTitle('Test Playlist Spotify playlist')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Spotify playlists available when online')
    ).not.toBeInTheDocument()
  })

  it('transitions from offline to online', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    const { rerender } = render(<SpotifyEmbed playlist={mockPlaylist} />)
    expect(
      screen.getByText('Spotify playlists available when online')
    ).toBeInTheDocument()

    mockUseOnlineStatus.mockReturnValue({ isOnline: true })
    rerender(<SpotifyEmbed playlist={mockPlaylist} />)
    expect(
      screen.getByTitle('Test Playlist Spotify playlist')
    ).toBeInTheDocument()
  })

  it('offline message text matches spec', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    render(<SpotifyEmbed playlist={mockPlaylist} />)
    expect(
      screen.getByText('Spotify playlists available when online')
    ).toBeInTheDocument()
  })
})
