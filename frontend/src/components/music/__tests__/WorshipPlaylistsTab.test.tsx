import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { WorshipPlaylistsTab } from '../WorshipPlaylistsTab'

const EXACT_DISCLAIMER =
  "Previews play here unless you're logged into a Spotify Premium account."

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

  it('Featured and Explore render as gradient-variant headings', () => {
    render(<WorshipPlaylistsTab />)
    const featured = screen.getByRole('heading', { level: 2, name: /featured/i })
    const explore = screen.getByRole('heading', { level: 2, name: /explore/i })
    // Gradient variant renders centered large font with inline gradient style
    for (const heading of [featured, explore]) {
      expect(heading.className).toContain('text-center')
      expect(heading.className).toContain('text-3xl')
      expect(heading.className).toContain('sm:text-4xl')
      expect(heading.className).toContain('lg:text-5xl')
      expect(heading.style.backgroundImage).not.toBe('')
      // Gradient variant is NOT the old small uppercase treatment
      expect(heading.className).not.toContain('uppercase')
      expect(heading.className).not.toContain('text-white/50')
    }
  })

  it('does not render a Caveat font accent', () => {
    const { container } = render(<WorshipPlaylistsTab />)
    expect(container.querySelector('.font-script')).toBeNull()
  })

  it('does not render a HeadingDivider SVG', () => {
    const { container } = render(<WorshipPlaylistsTab />)
    // Ensure no class or aria-label signals a HeadingDivider
    expect(container.querySelector('[class*="HeadingDivider"]')).toBeNull()
  })

  it('renders the preview disclaimer exactly once', () => {
    render(<WorshipPlaylistsTab />)
    const disclaimers = screen.getAllByText(EXACT_DISCLAIMER)
    expect(disclaimers).toHaveLength(1)
  })

  it('disclaimer copy matches the Round 2 spec string exactly', () => {
    render(<WorshipPlaylistsTab />)
    const disclaimer = screen.getByText(EXACT_DISCLAIMER)
    expect(disclaimer.textContent).toBe(EXACT_DISCLAIMER)
  })

  it('disclaimer is a plain centered paragraph (no Info icon, no card wrapper)', () => {
    render(<WorshipPlaylistsTab />)
    const disclaimer = screen.getByText(EXACT_DISCLAIMER)
    // Disclaimer IS the <p> (no wrapping span) per the Round 2 plan
    expect(disclaimer.tagName).toBe('P')
    expect(disclaimer.className).toContain('text-xs')
    // Round 2 §2.2 permits bumping from /40 → /60 if axe contrast check fails.
    // axe reported 3.78:1 at /40 (needs 4.5:1 for AA); /60 meets AA.
    expect(disclaimer.className).toContain('text-white/60')
    expect(disclaimer.className).toContain('text-center')
    expect(disclaimer.className).toContain('max-w-2xl')
    expect(disclaimer.className).toContain('mx-auto')
    expect(disclaimer.className).toContain('mt-3')
    // No svg (no Info icon) in the paragraph
    expect(disclaimer.querySelector('svg')).toBeNull()
  })

  it('disclaimer follows the hero Spotify embed in DOM order', () => {
    render(<WorshipPlaylistsTab />)
    const iframes = screen.getAllByTitle(/Spotify playlist/)
    const heroIframe = iframes[0]
    const disclaimer = screen.getByText(EXACT_DISCLAIMER)
    // Use compareDocumentPosition: heroIframe should precede disclaimer
    const pos = heroIframe.compareDocumentPosition(disclaimer)
    expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('does NOT render the old Round 1 disclaimer copy or Info icon', () => {
    render(<WorshipPlaylistsTab />)
    expect(screen.queryByText(/30-second previews/i)).toBeNull()
    expect(screen.queryByText(/Tap any track/)).toBeNull()
  })
})
