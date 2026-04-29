import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { SiteFooter } from '@/components/SiteFooter'

function renderSiteFooter() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SiteFooter />
    </MemoryRouter>
  )
}

describe('SiteFooter', () => {
  it('renders footer landmark', () => {
    renderSiteFooter()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders footer navigation', () => {
    renderSiteFooter()
    expect(
      screen.getByRole('navigation', { name: /footer navigation/i })
    ).toBeInTheDocument()
  })

  it('renders Worship Room logo text', () => {
    renderSiteFooter()
    expect(screen.getByText('Worship Room')).toBeInTheDocument()
  })

  it('renders 5 column labels (non-heading elements)', () => {
    renderSiteFooter()
    expect(screen.getByText('Daily')).toBeInTheDocument()
    expect(screen.getByText('Study')).toBeInTheDocument()
    expect(screen.getByText('Music')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('Legal')).toBeInTheDocument()
  })

  it('renders Community Guidelines link in the Legal column', () => {
    renderSiteFooter()
    const link = screen.getByRole('link', { name: 'Community Guidelines' })
    expect(link).toHaveAttribute('href', '/community-guidelines')
  })

  it('renders all 11 nav links with correct hrefs', () => {
    renderSiteFooter()

    const expectedLinks = [
      { name: 'Pray', href: '/pray' },
      { name: 'Journal', href: '/journal' },
      { name: 'Meditate', href: '/meditate' },
      { name: 'Daily Hub', href: '/daily' },
      { name: 'Worship Playlists', href: '/music/playlists' },
      { name: 'Ambient Sounds', href: '/music/ambient' },
      { name: 'Sleep & Rest', href: '/music/sleep' },
      { name: 'Prayer Wall', href: '/prayer-wall' },
      { name: 'Churches', href: '/local-support/churches' },
      { name: 'Counselors', href: '/local-support/counselors' },
      { name: 'Celebrate Recovery', href: '/local-support/celebrate-recovery' },
    ]

    for (const { name, href } of expectedLinks) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
    }
  })

  it('renders Spotify badge', () => {
    renderSiteFooter()
    expect(screen.getByText('Spotify')).toBeInTheDocument()
  })

  it('renders App Store badge text', () => {
    renderSiteFooter()
    expect(screen.getByText('App Store')).toBeInTheDocument()
  })

  it('renders Google Play badge text', () => {
    renderSiteFooter()
    expect(screen.getByText('Google Play')).toBeInTheDocument()
  })

  it('renders app download heading', () => {
    renderSiteFooter()
    expect(screen.getByText(/take worship room with you/i)).toBeInTheDocument()
  })

  it('renders crisis resources label', () => {
    renderSiteFooter()
    expect(screen.getByText(/if you're in crisis/i)).toBeInTheDocument()
  })

  it('renders 988 tel link', () => {
    renderSiteFooter()
    const link = screen.getByRole('link', { name: '988' })
    expect(link).toHaveAttribute('href', 'tel:988')
  })

  it('renders Crisis Text Line info', () => {
    renderSiteFooter()
    expect(
      screen.getByText(/text home to 741741/i)
    ).toBeInTheDocument()
  })

  it('renders SAMHSA helpline tel link', () => {
    renderSiteFooter()
    const link = screen.getByRole('link', { name: '1-800-662-4357' })
    expect(link).toHaveAttribute('href', 'tel:1-800-662-4357')
  })

  it('renders medical disclaimer', () => {
    renderSiteFooter()
    expect(
      screen.getByText(/not a substitute for professional/i)
    ).toBeInTheDocument()
  })

  it('renders copyright with current year', () => {
    renderSiteFooter()
    const year = new Date().getFullYear()
    expect(
      screen.getByText(new RegExp(`© ${year} worship room\\. all rights reserved\\.`, 'i'))
    ).toBeInTheDocument()
  })
})
