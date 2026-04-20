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
      screen.getByText(/Player couldn't load\. Tap below for full listening in the Spotify app\./)
    ).toBeInTheDocument()
    expect(screen.getByText(/Open in Spotify/)).toBeInTheDocument()
  })

  it('error state renders FrostedCard treatment', () => {
    const { container } = render(<SpotifyEmbed playlist={TEST_PLAYLIST} />)
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('rounded-xl')
    expect(root.className).toContain('border-white/[0.12]')
    expect(root.className).toContain('bg-white/[0.06]')
    expect(root.className).toContain('backdrop-blur-sm')
  })

  it('error CTA is a white pill with purple text and trailing arrow', () => {
    render(<SpotifyEmbed playlist={TEST_PLAYLIST} />)
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    const link = screen.getByRole('link', { name: /open in spotify/i })
    expect(link.className).toContain('bg-white')
    expect(link.className).toContain('text-primary')
    expect(link.textContent?.trim().endsWith('→')).toBe(true)
  })

  it('fallback link points to correct URL', () => {
    render(<SpotifyEmbed playlist={TEST_PLAYLIST} />)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    const link = screen.getByRole('link', { name: /open in spotify/i })
    expect(link).toHaveAttribute(
      'href',
      'https://open.spotify.com/playlist/abc123'
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
