import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { WorshipPlaylistsTab } from '../WorshipPlaylistsTab'

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

  it('Featured and Explore are uppercase SectionHeaders', () => {
    render(<WorshipPlaylistsTab />)
    const featured = screen.getByRole('heading', { level: 2, name: /featured/i })
    const explore = screen.getByRole('heading', { level: 2, name: /explore/i })
    expect(featured.className).toContain('uppercase')
    expect(featured.className).toContain('text-white/50')
    expect(explore.className).toContain('uppercase')
    expect(explore.className).toContain('text-white/50')
  })

  it('does not render a Caveat font accent', () => {
    const { container } = render(<WorshipPlaylistsTab />)
    expect(container.querySelector('.font-script')).toBeNull()
  })

  it('does not render a HeadingDivider SVG', () => {
    const { container } = render(<WorshipPlaylistsTab />)
    // HeadingDivider rendered an SVG as a child of the heading wrapper — no such SVG should exist now
    const headingSiblings = screen.getAllByRole('heading', { level: 2 })
    for (const heading of headingSiblings) {
      const parent = heading.parentElement
      const svg = parent?.querySelector('svg')
      if (svg) {
        // If any SVG is adjacent to a heading, verify it is NOT a HeadingDivider (which had specific viewBox)
        expect(svg.getAttribute('viewBox')).not.toMatch(/0 0 \d+ \d+/)
      }
    }
    // Ensure no class or aria-label signals a HeadingDivider
    expect(container.querySelector('[class*="HeadingDivider"]')).toBeNull()
  })

  it('renders the preview disclaimer twice (above Featured and Explore)', () => {
    render(<WorshipPlaylistsTab />)
    const disclaimers = screen.getAllByText(
      /30-second previews play here\. Tap any track or playlist to open in Spotify for full listening\./,
    )
    expect(disclaimers).toHaveLength(2)
  })

  it('disclaimer has an Info icon and the canonical small muted text style', () => {
    render(<WorshipPlaylistsTab />)
    const disclaimers = screen.getAllByText(/30-second previews play here/)
    for (const span of disclaimers) {
      const paragraph = span.parentElement as HTMLElement
      expect(paragraph.className).toContain('text-xs')
      expect(paragraph.className).toContain('text-white/50')
      expect(paragraph.querySelector('svg')).toBeInTheDocument()
    }
  })
})
