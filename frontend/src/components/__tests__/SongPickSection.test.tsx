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

  it('renders Spotify iframe with 352px height', () => {
    renderComponent()
    const iframe = document.querySelector('iframe[title]') as HTMLIFrameElement
    expect(iframe).toBeInTheDocument()
    expect(iframe.getAttribute('height')).toBe('352')
    expect(iframe.getAttribute('src')).toContain('open.spotify.com/embed/track')
  })

  it('renders two Follow Our Playlist links (one per breakpoint)', () => {
    renderComponent()
    const links = screen.getAllByRole('link', { name: /follow our playlist/i })
    expect(links).toHaveLength(2)
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', SPOTIFY_PLAYLIST_URL)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('renders follower count text in two places (one per breakpoint)', () => {
    renderComponent()
    const captions = screen.getAllByText(/117K\+/)
    expect(captions).toHaveLength(2)
  })

  it('has accessible section with aria-labelledby', () => {
    renderComponent()
    const section = screen.getByRole('heading', { level: 2 }).closest('section')
    expect(section).toHaveAttribute('aria-labelledby', 'song-pick-heading')
  })

  it('renders section divider with aria-hidden', () => {
    renderComponent()
    const section = screen.getByRole('heading', { level: 2 }).closest('section')
    const divider = section?.querySelector('.border-t')
    expect(divider).toBeInTheDocument()
    expect(divider).toHaveAttribute('aria-hidden', 'true')
  })

  it('does not use Caveat script font', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).not.toHaveClass('font-script')
    expect(heading.querySelector('.font-script')).not.toBeInTheDocument()
  })

  it('desktop CTA is hidden on mobile via responsive class', () => {
    renderComponent()
    const links = screen.getAllByRole('link', { name: /follow our playlist/i })
    // One wrapper has `hidden md:block`, the other has `md:hidden`
    const wrappers = links.map((l) => l.closest('div'))
    const hiddenOnMobile = wrappers.find((w) => w?.className.includes('hidden md:block'))
    const hiddenOnDesktop = wrappers.find((w) => w?.className.includes('md:hidden'))
    expect(hiddenOnMobile).toBeInTheDocument()
    expect(hiddenOnDesktop).toBeInTheDocument()
  })

  it('heading is flex-col with gradient "Today\'s" as the larger line', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveClass('flex', 'flex-col')
    const spans = heading.querySelectorAll('span')
    expect(spans).toHaveLength(2)
    // First span = "Today's" (gradient, larger)
    expect(spans[0]).toHaveTextContent("Today's")
    expect(spans[0].className).toContain('text-4xl')
    expect(spans[0].className).toContain('sm:text-5xl')
    expect(spans[0].className).toContain('lg:text-6xl')
    // Second span = "Song Pick" (white, smaller)
    expect(spans[1]).toHaveTextContent('Song Pick')
    expect(spans[1]).toHaveClass('text-white')
    expect(spans[1].className).toContain('text-2xl')
    expect(spans[1].className).toContain('sm:text-3xl')
    expect(spans[1].className).toContain('lg:text-4xl')
  })
})
