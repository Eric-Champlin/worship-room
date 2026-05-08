import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrayerWallHero } from '../PrayerWallHero'

describe('PrayerWallHero', () => {
  it('renders heading "Prayer Wall"', () => {
    render(<PrayerWallHero />)
    expect(screen.getByRole('heading', { name: 'Prayer Wall', level: 1 })).toBeInTheDocument()
  })

  it('renders subtitle "You\'re not alone."', () => {
    render(<PrayerWallHero />)
    expect(screen.getByText("You're not alone.")).toBeInTheDocument()
  })

  it('renders title with padding for gradient text clipping', () => {
    render(<PrayerWallHero />)
    const heading = screen.getByRole('heading', { name: 'Prayer Wall' })
    expect(heading.className).toContain('px-1')
    expect(heading.className).toContain('sm:px-2')
  })

  it('has accessible section landmark with aria-label', () => {
    render(<PrayerWallHero />)
    const section = screen.getByRole('region', { name: 'Prayer Wall' })
    expect(section).toBeInTheDocument()
  })

  it('heading has gradient inline style', () => {
    render(<PrayerWallHero />)
    const heading = screen.getByRole('heading', { name: 'Prayer Wall' })
    expect(heading.style.backgroundImage).toContain('linear-gradient')
  })

  it('does NOT use font-script (Spec 14 cleanup — Caveat reserved for wordmark + RouteLoadingFallback)', () => {
    render(<PrayerWallHero />)
    const heading = screen.getByRole('heading', { name: 'Prayer Wall' })
    expect(heading.querySelector('.font-script')).toBeNull()
    // Heading text is the literal string "Prayer Wall" with no <span> child
    expect(heading.textContent).toBe('Prayer Wall')
    expect(heading.childElementCount).toBe(0)
  })

  it('subtitle does NOT use font-serif italic (Spec 14 cleanup — canonical hero subtitle treatment)', () => {
    render(<PrayerWallHero />)
    const subtitle = screen.getByText("You're not alone.")
    expect(subtitle.className).not.toContain('font-serif')
    expect(subtitle.className).not.toContain('italic')
    expect(subtitle.className).toContain('text-white')
    expect(subtitle.className).not.toContain('text-white/60')
  })

  it('mounts CinematicHeroBackground as first child (Spec 14)', () => {
    const { container } = render(<PrayerWallHero />)
    const cinematic = container.querySelector('[data-testid="cinematic-hero-background"]')
    expect(cinematic).toBeInTheDocument()
    const section = container.querySelector('section[aria-labelledby="prayer-wall-heading"]')
    expect(section?.firstElementChild).toBe(cinematic)
  })

  it('uses navbar-compensated padding pt-[145px] pb-12 (no responsive modifiers)', () => {
    const { container } = render(<PrayerWallHero />)
    const section = container.querySelector('section[aria-labelledby="prayer-wall-heading"]')
    expect(section?.className).toContain('pt-[145px]')
    expect(section?.className).toContain('pb-12')
    expect(section?.className).not.toContain('sm:pt-36')
    expect(section?.className).not.toContain('lg:pt-40')
  })
})
