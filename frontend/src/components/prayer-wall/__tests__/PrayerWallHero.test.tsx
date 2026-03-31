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

  it('accent word "Wall" renders in font-script span', () => {
    render(<PrayerWallHero />)
    const heading = screen.getByRole('heading', { name: 'Prayer Wall' })
    const scriptSpan = heading.querySelector('.font-script')
    expect(scriptSpan).toBeInTheDocument()
    expect(scriptSpan?.textContent).toBe('Wall')
  })
})
