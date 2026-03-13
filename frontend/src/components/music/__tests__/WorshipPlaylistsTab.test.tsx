import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { WorshipPlaylistsTab } from '../WorshipPlaylistsTab'

vi.mock('@/hooks/useElementWidth', () => ({
  useElementWidth: vi.fn(() => ({
    ref: { current: null },
    width: 400,
  })),
}))

describe('WorshipPlaylistsTab', () => {
  it('renders "Featured" heading', () => {
    render(<WorshipPlaylistsTab />)
    expect(screen.getByText('Featured')).toBeInTheDocument()
  })

  it('renders "Explore" heading', () => {
    render(<WorshipPlaylistsTab />)
    expect(screen.getByText('Explore')).toBeInTheDocument()
  })

  it('does not render "Worship & Praise" heading', () => {
    render(<WorshipPlaylistsTab />)
    expect(screen.queryByText('Worship & Praise')).not.toBeInTheDocument()
  })

  it('does not render follower count', () => {
    render(<WorshipPlaylistsTab />)
    expect(screen.queryByText(/117,000/)).not.toBeInTheDocument()
  })

  it('does not render Lofi playlist', () => {
    render(<WorshipPlaylistsTab />)
    expect(screen.queryByText(/Lofi/i)).not.toBeInTheDocument()
  })

  it('does not render pause toggle', () => {
    render(<WorshipPlaylistsTab />)
    expect(screen.queryByText(/pause ambient/i)).not.toBeInTheDocument()
  })

  it('hero embed has 500px height', () => {
    render(<WorshipPlaylistsTab />)
    const iframes = screen.getAllByTitle(/Spotify playlist/)
    const heroIframe = iframes[0]
    expect(heroIframe).toHaveAttribute('height', '500')
  })

  it('renders 7 Spotify embeds (1 hero + 6 explore)', () => {
    render(<WorshipPlaylistsTab />)
    const iframes = screen.getAllByTitle(/Spotify playlist/)
    expect(iframes).toHaveLength(7)
  })
})
