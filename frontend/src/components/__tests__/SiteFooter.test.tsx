import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { SiteFooter } from '@/components/SiteFooter'

function renderSiteFooter() {
  return render(
    <MemoryRouter>
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

  it('renders 3 column headings at level 3', () => {
    renderSiteFooter()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Daily' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Music' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Support' })
    ).toBeInTheDocument()
  })

  it('renders all 10 nav links with correct hrefs', () => {
    renderSiteFooter()

    const expectedLinks = [
      { name: 'Pray', href: '/scripture' },
      { name: 'Journal', href: '/journal' },
      { name: 'Meditate', href: '/meditate' },
      { name: 'Verse & Song', href: '/daily' },
      { name: 'Worship Playlists', href: '/music/playlists' },
      { name: 'Ambient Sounds', href: '/music/ambient' },
      { name: 'Sleep & Rest', href: '/music/sleep' },
      { name: 'Prayer Wall', href: '/prayer-wall' },
      { name: 'Churches', href: '/churches' },
      { name: 'Counselors', href: '/counselors' },
    ]

    for (const { name, href } of expectedLinks) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
    }
  })

  it('renders App Store badge', () => {
    renderSiteFooter()
    const badge = screen.getByLabelText(/download on the app store/i)
    expect(badge).toHaveAttribute('href', '#')
  })

  it('renders Google Play badge', () => {
    renderSiteFooter()
    const badge = screen.getByLabelText(/get it on google play/i)
    expect(badge).toHaveAttribute('href', '#')
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
