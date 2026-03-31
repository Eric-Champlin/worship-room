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
  it('renders heading', () => {
    renderComponent()
    expect(
      screen.getByRole('heading', { name: /today's song pick/i }),
    ).toBeInTheDocument()
  })

  it('renders Spotify iframe', () => {
    renderComponent()
    const iframe = document.querySelector('iframe[title]') as HTMLIFrameElement
    expect(iframe).toBeInTheDocument()
    expect(iframe.getAttribute('height')).toBe('280')
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

  it('wraps content in frosted glass card', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { name: /today's song pick/i })
    const card = heading.closest('.rounded-2xl')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('border')
    expect(card).toHaveClass('backdrop-blur-sm')
  })

  it('renders music icon in heading', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { name: /today's song pick/i })
    const svg = heading.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})
