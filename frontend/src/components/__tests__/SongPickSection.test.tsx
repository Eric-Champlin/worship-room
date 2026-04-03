import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SongPickSection } from '../SongPickSection'
import { SPOTIFY_PLAYLIST_URL } from '@/constants/daily-experience'

function renderComponent() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SongPickSection />
    </MemoryRouter>,
  )
}

describe('SongPickSection', () => {
  it('renders heading with gradient "Today\'s" and white "Song Pick"', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent("Today's")
    expect(heading).toHaveTextContent('Song Pick')
  })

  it('applies gradient text style to "Today\'s" line', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    const gradientSpan = heading.querySelector('span')
    expect(gradientSpan).toHaveStyle({ backgroundClip: 'text' })
  })

  it('does not render music icon in heading', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.querySelector('svg')).not.toBeInTheDocument()
  })

  it('does not render HeadingDivider', () => {
    renderComponent()
    // HeadingDivider renders an SVG with specific viewBox
    const section = screen.getByRole('heading', { level: 2 }).closest('section')
    const svgs = section?.querySelectorAll('svg[viewBox]') ?? []
    expect(svgs.length).toBe(0)
  })

  it('does not render glass card wrapper', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    const card = heading.closest('.backdrop-blur-sm.border.rounded-2xl.bg-white\\/\\[0\\.03\\]')
    expect(card).not.toBeInTheDocument()
  })

  it('renders GlowBackground with glow orb', () => {
    renderComponent()
    expect(screen.getByTestId('glow-orb')).toBeInTheDocument()
  })

  it('renders Spotify iframe with 152px height', () => {
    renderComponent()
    const iframe = document.querySelector('iframe[title]') as HTMLIFrameElement
    expect(iframe).toBeInTheDocument()
    expect(iframe.getAttribute('height')).toBe('152')
    expect(iframe.getAttribute('src')).toContain('open.spotify.com/embed/track')
  })

  it('renders Follow Our Playlist link', () => {
    renderComponent()
    const link = screen.getByRole('link', { name: /follow our playlist/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', SPOTIFY_PLAYLIST_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders follower count text', () => {
    renderComponent()
    expect(screen.getByText(/117K\+/)).toBeInTheDocument()
  })

  it('has accessible section with aria-labelledby', () => {
    renderComponent()
    const section = screen.getByRole('heading', { level: 2 }).closest('section')
    expect(section).toHaveAttribute('aria-labelledby', 'song-pick-heading')
  })

  it('renders section divider', () => {
    renderComponent()
    const section = screen.getByRole('heading', { level: 2 }).closest('section')
    const divider = section?.querySelector('.border-t')
    expect(divider).toBeInTheDocument()
  })

  it('does not use Caveat script font', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).not.toHaveClass('font-script')
    expect(heading.querySelector('.font-script')).not.toBeInTheDocument()
  })
})
