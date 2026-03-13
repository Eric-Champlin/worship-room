import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'

import type { SpotifyPlaylist } from '@/data/music/playlists'
import { SpotifyEmbed } from '../SpotifyEmbed'

const TEST_PLAYLIST: SpotifyPlaylist = {
  id: 'test-playlist',
  name: 'Test Worship Playlist',
  spotifyId: 'abc123',
  spotifyUrl: 'https://open.spotify.com/playlist/abc123',
  section: 'worship',
  displaySize: 'standard',
}

describe('SpotifyEmbed', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders iframe with correct src', () => {
    render(<SpotifyEmbed playlist={TEST_PLAYLIST} />)
    const iframe = screen.getByTitle('Test Worship Playlist Spotify playlist')
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute(
      'src',
      'https://open.spotify.com/embed/playlist/abc123'
    )
  })

  it('sets loading="lazy"', () => {
    render(<SpotifyEmbed playlist={TEST_PLAYLIST} />)
    const iframe = screen.getByTitle('Test Worship Playlist Spotify playlist')
    expect(iframe).toHaveAttribute('loading', 'lazy')
  })

  it('sets title for accessibility', () => {
    render(<SpotifyEmbed playlist={TEST_PLAYLIST} />)
    expect(
      screen.getByTitle('Test Worship Playlist Spotify playlist')
    ).toBeInTheDocument()
  })

  it('shows fallback on error (timeout)', () => {
    render(<SpotifyEmbed playlist={TEST_PLAYLIST} />)
    expect(
      screen.getByTitle('Test Worship Playlist Spotify playlist')
    ).toBeInTheDocument()

    // Advance past 10-second timeout to trigger error state
    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.getByText('Test Worship Playlist')).toBeInTheDocument()
    expect(
      screen.getByText(/Player couldn't load — tap to open in Spotify/)
    ).toBeInTheDocument()
    expect(screen.getByText('Open in Spotify')).toBeInTheDocument()
  })

  it('fallback link points to correct URL', () => {
    render(<SpotifyEmbed playlist={TEST_PLAYLIST} />)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    const link = screen.getByText('Open in Spotify')
    expect(link).toHaveAttribute(
      'href',
      'https://open.spotify.com/playlist/abc123'
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
