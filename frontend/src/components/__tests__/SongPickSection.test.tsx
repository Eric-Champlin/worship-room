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

  it('renders Follow Our Playlist link', () => {
    renderComponent()
    const links = screen.getAllByRole('link', { name: /follow our playlist/i })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', SPOTIFY_PLAYLIST_URL)
    expect(links[0]).toHaveAttribute('target', '_blank')
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders follower count text', () => {
    renderComponent()
    const captions = screen.getAllByText(/117K\+/)
    expect(captions).toHaveLength(1)
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

  it('uses single CTA block without responsive duplication', () => {
    renderComponent()
    const links = screen.getAllByRole('link', { name: /follow our playlist/i })
    expect(links).toHaveLength(1)
    // No hidden/md:hidden wrappers — single always-visible block
    const wrapper = links[0].closest('div')
    expect(wrapper?.className).not.toContain('hidden')
    expect(wrapper?.className).not.toContain('md:hidden')
  })

  it('heading is flex-col with gradient "Today\'s" as the larger line', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveClass('flex', 'flex-col')
    const spans = heading.querySelectorAll('span')
    expect(spans).toHaveLength(2)
    // First span = "Today's" (gradient, larger, leading-none)
    expect(spans[0]).toHaveTextContent("Today's")
    expect(spans[0].className).toContain('text-4xl')
    expect(spans[0].className).toContain('sm:text-5xl')
    expect(spans[0].className).toContain('lg:text-6xl')
    expect(spans[0].className).toContain('leading-none')
    // Second span = "Song Pick" (white, smaller, leading-none, no tracking)
    expect(spans[1]).toHaveTextContent('Song Pick')
    expect(spans[1]).toHaveClass('text-white')
    expect(spans[1].className).toContain('text-2xl')
    expect(spans[1].className).toContain('sm:text-3xl')
    expect(spans[1].className).toContain('lg:text-4xl')
    expect(spans[1].className).toContain('leading-none')
    expect(spans[1].className).not.toContain('tracking-')
  })

  it('uses max-w-2xl centered column layout', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    const container = heading.closest('.max-w-2xl')
    expect(container).toBeInTheDocument()
    // No side-by-side layout classes
    expect(container?.className).not.toContain('md:flex-row')
    expect(container?.className).not.toContain('max-w-4xl')
  })

  it('Song Pick has no letter-spacing manipulation', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    const spans = heading.querySelectorAll('span')
    expect(spans[1]).toHaveTextContent('Song Pick')
    expect(spans[1].className).not.toContain('tracking-')
  })
})
