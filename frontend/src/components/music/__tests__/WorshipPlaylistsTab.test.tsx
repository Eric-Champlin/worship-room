import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { WorshipPlaylistsTab } from '../WorshipPlaylistsTab'

import { useSpotifyAutoPause } from '@/hooks/useSpotifyAutoPause'

vi.mock('@/hooks/useSpotifyAutoPause', () => ({
  useSpotifyAutoPause: vi.fn(() => ({
    spotifyDetected: false,
    manualPauseEnabled: true,
    setManualPauseEnabled: vi.fn(),
    handleManualPause: vi.fn(),
  })),
}))

const mockUseSpotifyAutoPause = vi.mocked(useSpotifyAutoPause)

describe('WorshipPlaylistsTab', () => {
  it('renders "Worship & Praise" heading', () => {
    render(<WorshipPlaylistsTab />)
    expect(screen.getByText('Worship & Praise')).toBeInTheDocument()
  })

  it('renders "Explore" heading', () => {
    render(<WorshipPlaylistsTab />)
    expect(screen.getByText('Explore')).toBeInTheDocument()
  })

  it('renders 8 Spotify embeds', () => {
    render(<WorshipPlaylistsTab />)
    const iframes = screen.getAllByTitle(/Spotify playlist/)
    expect(iframes).toHaveLength(8)
  })

  it('hero embed has 500px height', () => {
    render(<WorshipPlaylistsTab />)
    const iframes = screen.getAllByTitle(/Spotify playlist/)
    const heroIframe = iframes[0]
    expect(heroIframe).toHaveAttribute('height', '500')
  })

  it('shows follower count', () => {
    render(<WorshipPlaylistsTab />)
    expect(screen.getByText(/117,000/)).toBeInTheDocument()
  })

  it('lofi embed has scroll target id', () => {
    render(<WorshipPlaylistsTab />)
    expect(document.getElementById('lofi-embed')).toBeInTheDocument()
  })

  it('shows manual toggle when spotify detection fails', () => {
    render(<WorshipPlaylistsTab />)
    expect(
      screen.getByLabelText(/pause ambient while playing playlists/i),
    ).toBeInTheDocument()
  })

  it('toggle defaults to checked', () => {
    render(<WorshipPlaylistsTab />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('does not show toggle when detection works', () => {
    mockUseSpotifyAutoPause.mockReturnValue({
      spotifyDetected: true,
      manualPauseEnabled: true,
      setManualPauseEnabled: vi.fn(),
      handleManualPause: vi.fn(),
    })
    render(<WorshipPlaylistsTab />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('shows accessible pause buttons when detection fails and manual pause enabled', () => {
    mockUseSpotifyAutoPause.mockReturnValue({
      spotifyDetected: false,
      manualPauseEnabled: true,
      setManualPauseEnabled: vi.fn(),
      handleManualPause: vi.fn(),
    })
    render(<WorshipPlaylistsTab />)
    const pauseButtons = screen.getAllByRole('button', { name: /pause ambient sounds/i })
    expect(pauseButtons.length).toBeGreaterThan(0)
  })

  it('hides pause buttons when detection works', () => {
    mockUseSpotifyAutoPause.mockReturnValue({
      spotifyDetected: true,
      manualPauseEnabled: true,
      setManualPauseEnabled: vi.fn(),
      handleManualPause: vi.fn(),
    })
    render(<WorshipPlaylistsTab />)
    expect(screen.queryByRole('button', { name: /pause ambient sounds/i })).not.toBeInTheDocument()
  })
})
